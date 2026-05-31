"use client";

import { useMemo, useState } from "react";
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
import { useShowroomStore } from "@/lib/offline-store";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const emptyInvoice: InvoiceInput = {
  vehicleId: "",
  customerId: "",
  type: "cash",
  total: 0,
  discount: 0,
  tax: 0
};

export function SalesModule() {
  const vehicles = useShowroomStore((s) => s.vehicles);
  const customers = useShowroomStore((s) => s.customers);
  const invoices = useShowroomStore((s) => s.invoices);
  const addInvoice = useShowroomStore((s) => s.addInvoice);
  const deleteInvoice = useShowroomStore((s) => s.deleteInvoice);
  const { log, items } = useActionLog();
  const [loading, setLoading] = useState(false);
  const form = useForm<InvoiceInput>({ defaultValues: emptyInvoice });

  const rows = useMemo(() => {
    return invoices.map((inv, index) => {
      const vehicle = vehicles.find((v) => v.id === inv.vehicleId);
      const customer = customers.find((c) => c.id === inv.customerId);
      const net = inv.total - inv.discount + inv.tax;
      const docNo = `INV-${String(index + 1).padStart(6, "0")}`;
      return { inv, vehicle, customer, net, docNo };
    });
  }, [invoices, vehicles, customers]);

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
            const invoice = addInvoice(parsed.data);
            log(`تم إصدار الفاتورة ${invoice.id} وتسجيلها في المحاسبة.`);
            form.reset(emptyInvoice);
            setLoading(false);
          })}
        >
          <SelectVehicle register={form.register("vehicleId")} vehicles={vehicles.filter((v) => v.status !== "sold")} />
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
          <div className="md:col-span-2">
            <PrimaryButton type="submit" disabled={loading}>
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
          {rows.length === 0 ? (
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
                        onPrinted={() => log(`طباعة فاتورة ${row.docNo}`)}
                        lineItemsEditor={{
                          initialLineItems: invoiceToDefaultLineItems(row.inv, row.vehicle),
                          buildHtml: (items) => printInvoice(row.docNo, row, items)
                        }}
                      />
                      <PrintDocumentActions
                        title={`عقد ${row.docNo}`}
                        getHtml={() => printContract(row.docNo, row)}
                        onPrinted={() => log(`طباعة عقد ${row.docNo}`)}
                      />
                      <DeleteRowButton
                        onConfirm={() => {
                          const result = deleteInvoice(row.inv.id);
                          if (!result.ok) window.alert(result.message);
                          else log(`حذف الفاتورة ${row.docNo}`);
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
