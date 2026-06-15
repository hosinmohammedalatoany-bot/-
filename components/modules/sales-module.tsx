"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ar } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import {
  buildInvoicePrintHtml,
  buildSaleContractPrintHtml,
  buildTableReportHtml
} from "@/components/print/document-templates";
import { PrintDocumentActions } from "@/components/print/print-document-actions";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { invoiceToDefaultLineItems } from "@/lib/print-line-items";
import { SelectCustomer, SelectVehicle } from "@/components/modules/form-selectors";
import { ModulePage } from "@/components/modules/module-page";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { EmptyState, Field, PrimaryButton, inputClass } from "@/components/ui/primitives";
import { canUsePermission, type ClientUser } from "@/lib/client-permissions";
import { useShowroomStore } from "@/lib/offline-store";
import { invoiceFromApi } from "@/lib/sales-map";
import { vehicleFromApi } from "@/lib/vehicles-map";
import type { Customer, Invoice, Vehicle } from "@/lib/domain";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation";
import { registerPrintEvent } from "@/lib/register-print";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const apiSalesEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

const DISCOUNT_APPROVAL_PERCENT = 10;

function readSessionUser(): ClientUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("br_user");
    return raw ? (JSON.parse(raw) as ClientUser) : null;
  } catch {
    return null;
  }
}

const emptyInvoice: InvoiceInput = {
  vehicleId: "",
  customerId: "",
  type: "cash",
  total: 0,
  discount: 0,
  tax: 0
};

export function SalesModule() {
  const storeVehicles = useShowroomStore((s) => s.vehicles);
  const storeCustomers = useShowroomStore((s) => s.customers);
  const storeInvoices = useShowroomStore((s) => s.invoices);
  const recordPrintStore = useShowroomStore((s) => s.recordPrint);
  const addInvoiceStore = useShowroomStore((s) => s.addInvoice);
  const deleteInvoiceStore = useShowroomStore((s) => s.deleteInvoice);
  const { log, items } = useActionLog();
  const [sessionUser] = useState(readSessionUser);
  const [apiInvoices, setApiInvoices] = useState<Invoice[] | null>(null);
  const [apiVehicles, setApiVehicles] = useState<Vehicle[] | null>(null);
  const [apiCustomers, setApiCustomers] = useState<Customer[] | null>(null);
  const [fetching, setFetching] = useState(apiSalesEnabled);
  const [loading, setLoading] = useState(false);
  const [forceReservedSale, setForceReservedSale] = useState(false);
  const [forceDiscount, setForceDiscount] = useState(false);
  const form = useForm<InvoiceInput>({ defaultValues: emptyInvoice });

  const canOverrideReserved = canUsePermission(sessionUser, "sale.override_lock");
  const canApproveDiscount = canUsePermission(sessionUser, "discount.approve");

  const vehicles = apiSalesEnabled && apiVehicles !== null ? apiVehicles : storeVehicles;
  const customers = apiSalesEnabled && apiCustomers !== null ? apiCustomers : storeCustomers;
  const invoices = apiSalesEnabled && apiInvoices !== null ? apiInvoices : storeInvoices;

  const loadData = useCallback(async () => {
    if (!apiSalesEnabled) return;
    setFetching(true);
    try {
      const [invRes, vehRes, custRes] = await Promise.all([
        fetch("/api/sales/invoices", { credentials: "include" }),
        fetch("/api/vehicles", { credentials: "include" }),
        fetch("/api/customers", { credentials: "include" })
      ]);
      const invData = (await invRes.json()) as { invoices?: unknown[]; error?: string };
      const vehData = (await vehRes.json()) as { vehicles?: unknown[]; error?: string };
      const custData = (await custRes.json()) as { customers?: unknown[]; error?: string };
      if (!invRes.ok) throw new Error(invData.error ?? "تعذر تحميل الفواتير");
      if (!vehRes.ok) throw new Error(vehData.error ?? "تعذر تحميل السيارات");
      if (!custRes.ok) throw new Error(custData.error ?? "تعذر تحميل العملاء");
      setApiInvoices(
        (invData.invoices ?? []).map((row) => invoiceFromApi(row as Record<string, unknown>))
      );
      setApiVehicles(
        (vehData.vehicles ?? []).map((row) => vehicleFromApi(row as Record<string, unknown>))
      );
      setApiCustomers(
        (custData.customers ?? []).map((row) => {
          const r = row as Record<string, unknown>;
          return {
            id: String(r.id),
            name: String(r.name ?? ""),
            phone: String(r.phone ?? ""),
            email: String(r.email ?? ""),
            address: String(r.address ?? ""),
            idNumber: String(r.id_number ?? r.idNumber ?? ""),
            balance: Number(r.balance ?? 0),
            purchases: Number(r.purchases ?? 0),
            notes: String(r.notes ?? ""),
            createdAt: String(r.created_at ?? r.createdAt ?? new Date().toISOString())
          };
        })
      );
    } catch (e) {
      log(e instanceof Error ? e.message : "تعذر تحميل المبيعات");
    } finally {
      setFetching(false);
    }
  }, [log]);

  useEffect(() => {
    if (!apiSalesEnabled) return;
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const watchedTotal = form.watch("total");
  const watchedDiscount = form.watch("discount");
  const discountNeedsApproval =
    Number(watchedTotal) > 0 &&
    Number(watchedDiscount) > 0 &&
    (Number(watchedDiscount) / Number(watchedTotal)) * 100 > DISCOUNT_APPROVAL_PERCENT;

  const rows = useMemo(() => {
    return invoices.map((inv, index) => {
      const vehicle = vehicles.find((v) => v.id === inv.vehicleId);
      const customer = customers.find((c) => c.id === inv.customerId);
      const net = inv.total - inv.discount + inv.tax;
      const docNo =
        inv.documentNumber?.trim() ||
        `INV-${String(index + 1).padStart(6, "0")}`;
      return { inv, vehicle, customer, net, docNo };
    });
  }, [invoices, vehicles, customers]);

  const sellableVehicles = vehicles.filter((v) => {
    if (v.status === "sold") return false;
    if (v.status === "reserved" && !canOverrideReserved && !forceReservedSale) return false;
    return true;
  });

  const reportHtml = buildTableReportHtml(
    "تقرير المبيعات",
    ["الفاتورة", "العميل", "السيارة", "الإجمالي", "التاريخ"],
    rows.map((r) => [
      r.docNo,
      r.customer?.name ?? "—",
      r.vehicle ? `${r.vehicle.manufacturer} ${r.vehicle.model}` : "—",
      formatCurrency(r.net),
      formatDateTime(r.inv.createdAt)
    ])
  );

  function printInvoice(docNo: string, row: (typeof rows)[0], lineItems?: ReturnType<typeof invoiceToDefaultLineItems>) {
    return buildInvoicePrintHtml({
      invoiceNumber: docNo,
      invoice: row.inv,
      vehicle: row.vehicle,
      customer: row.customer,
      lineItems
    });
  }

  function printContract(docNo: string, row: (typeof rows)[0]) {
    return buildSaleContractPrintHtml({
      contractNumber: docNo.replace(/^INV/, "CNT"),
      invoice: row.inv,
      vehicle: row.vehicle,
      customer: row.customer
    });
  }

  return (
    <ModulePage moduleKey="sales">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">إصدار فاتورة بيع</h3>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (data) => {
            setLoading(true);
            const parsed = invoiceSchema.safeParse(data);
            if (!parsed.success) {
              log(parsed.error.issues[0]?.message ?? ar.error);
              setLoading(false);
              return;
            }
            const sold = vehicles.find((v) => v.id === parsed.data.vehicleId);
            if (sold?.status === "sold") {
              log("لا يمكن بيع نفس السيارة مرتين.");
              setLoading(false);
              return;
            }
            if (
              sold?.status === "reserved" &&
              !canOverrideReserved &&
              !forceReservedSale
            ) {
              log("السيارة محجوزة — يلزم صلاحية بيع سيارة محجوزة.");
              setLoading(false);
              return;
            }
            const needsApproval =
              parsed.data.total > 0 &&
              parsed.data.discount > 0 &&
              (parsed.data.discount / parsed.data.total) * 100 > DISCOUNT_APPROVAL_PERCENT;
            if (needsApproval && !canApproveDiscount && !forceDiscount) {
              log(`الخصم يتجاوز ${DISCOUNT_APPROVAL_PERCENT}% — يلزم موافقة إدارية.`);
              setLoading(false);
              return;
            }
            if (apiSalesEnabled) {
              try {
                const res = await fetch("/api/sales/invoices", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...parsed.data,
                    forceReservedSale: forceReservedSale && canOverrideReserved,
                    forceDiscount: forceDiscount && canApproveDiscount
                  })
                });
                const body = (await res.json()) as { error?: string };
                if (!res.ok) throw new Error(body.error ?? "تعذر إصدار الفاتورة");
                log("تم إصدار الفاتورة وتسجيل بيع السيارة.");
                form.reset(emptyInvoice);
                setForceReservedSale(false);
                setForceDiscount(false);
                await loadData();
              } catch (e) {
                log(e instanceof Error ? e.message : "تعذر إصدار الفاتورة");
              }
            } else {
              const invoice = addInvoiceStore(parsed.data);
              log(`تم إصدار الفاتورة ${invoice.id} وتسجيلها في المحاسبة.`);
              form.reset(emptyInvoice);
            }
            setLoading(false);
          })}
        >
          <SelectVehicle register={form.register("vehicleId")} vehicles={sellableVehicles} />
          <SelectCustomer register={form.register("customerId")} customers={customers} />
          <Field label="طريقة الدفع">
            <select className={inputClass} {...form.register("type")}>
              <option value="cash">{ar.paymentType.cash}</option>
              <option value="bank-transfer">{ar.paymentType["bank-transfer"]}</option>
              <option value="installment">{ar.paymentType.installment}</option>
              <option value="mixed">{ar.paymentType.mixed}</option>
            </select>
          </Field>
          <Field label="سعر السيارة">
            <input type="number" className={inputClass} {...form.register("total")} />
          </Field>
          <Field label="الخصم">
            <input type="number" className={inputClass} {...form.register("discount")} />
          </Field>
          <Field label="الضريبة">
            <input type="number" className={inputClass} {...form.register("tax")} />
          </Field>
          {discountNeedsApproval && canApproveDiscount && (
            <label className="flex items-center gap-2 text-sm text-amber-200/90 md:col-span-2">
              <input
                type="checkbox"
                checked={forceDiscount}
                onChange={(e) => setForceDiscount(e.target.checked)}
              />
              اعتماد خصم يتجاوز {DISCOUNT_APPROVAL_PERCENT}% (صلاحية إدارية)
            </label>
          )}
          {canOverrideReserved && (
            <label className="flex items-center gap-2 text-sm text-white/70 md:col-span-2">
              <input
                type="checkbox"
                checked={forceReservedSale}
                onChange={(e) => setForceReservedSale(e.target.checked)}
              />
              بيع سيارة محجوزة (صلاحية خاصة)
            </label>
          )}
          <div className="md:col-span-2">
            <PrimaryButton disabled={loading}>
              {loading ? ar.loading : "إصدار الفاتورة"}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">فواتير المبيعات</h3>
        <PrintToolbar
          title="مبيعات"
          printHtmlBody={reportHtml}
          csvFilename="sales.csv"
          csvHeaders={["الفاتورة", "العميل", "الإجمالي"]}
          csvRows={rows.map((r) => [r.docNo, r.customer?.name ?? "", r.net])}
        />
        <div className="mt-4 overflow-x-auto">
          {fetching ? (
            <p className="text-sm text-white/50">{ar.loading}</p>
          ) : rows.length === 0 ? (
            <EmptyState title={ar.noData} />
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="py-2 text-start">الفاتورة</th>
                  <th className="text-start">العميل</th>
                  <th className="text-start">السيارة</th>
                  <th className="text-start">الإجمالي</th>
                  <th className="text-start">{ar.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((row) => (
                  <tr key={row.inv.id}>
                    <td className="py-3 font-semibold">{row.docNo}</td>
                    <td>{row.customer?.name ?? "—"}</td>
                    <td>{row.vehicle ? `${row.vehicle.manufacturer} ${row.vehicle.model}` : "—"}</td>
                    <td>{formatCurrency(row.net)}</td>
                    <td className="space-y-2">
                      <PrintDocumentActions
                        title={`فاتورة ${row.docNo}`}
                        getHtml={() => printInvoice(row.docNo, row)}
                        onPrinted={() => {
                          void registerPrintEvent(recordPrintStore, {
                            documentType: "invoice",
                            documentNumber: row.docNo
                          });
                          log(`طباعة فاتورة ${row.docNo}`);
                        }}
                        lineItemsEditor={{
                          initialLineItems: invoiceToDefaultLineItems(row.inv, row.vehicle),
                          buildHtml: (items) => printInvoice(row.docNo, row, items)
                        }}
                      />
                      <PrintDocumentActions
                        title={`عقد ${row.docNo}`}
                        getHtml={() => printContract(row.docNo, row)}
                        onPrinted={() => {
                          void registerPrintEvent(recordPrintStore, {
                            documentType: "contract",
                            documentNumber: row.docNo.replace(/^INV/, "CNT")
                          });
                          log(`طباعة عقد ${row.docNo}`);
                        }}
                      />
                      <DeleteRowButton
                        onConfirm={async () => {
                          if (apiSalesEnabled) {
                            const res = await fetch(`/api/sales/invoices/${row.inv.id}`, {
                              method: "DELETE",
                              credentials: "include"
                            });
                            const body = (await res.json().catch(() => ({}))) as {
                              error?: string;
                            };
                            if (!res.ok) {
                              window.alert(body.error ?? "تعذر حذف الفاتورة");
                              return;
                            }
                            log(`أُرشفت الفاتورة ${row.docNo}`);
                            await loadData();
                          } else {
                            const result = deleteInvoiceStore(row.inv.id);
                            if (!result.ok) window.alert(result.message);
                            else log(`حذف الفاتورة ${row.docNo}`);
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {items.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-white/50">
            {items.slice(0, 5).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    </ModulePage>
  );
}
