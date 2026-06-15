"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ar } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import {
  buildInstallmentContractPrintHtml,
  buildPaymentReceiptPrintHtml,
  buildTableReportHtml
} from "@/components/print/document-templates";
import { PrintDocumentActions } from "@/components/print/print-document-actions";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { installmentsToScheduleRows } from "@/lib/print-line-items";
import { SelectCustomer, SelectVehicle } from "@/components/modules/form-selectors";
import { ModulePage } from "@/components/modules/module-page";
import { EmptyState, Field, PrimaryButton, StatusBadge, inputClass } from "@/components/ui/primitives";
import { canUsePermission, type ClientUser } from "@/lib/client-permissions";
import type { Customer, Installment, Vehicle } from "@/lib/domain";
import { contractFromApi, type InstallmentContractApi } from "@/lib/installments-map";
import { customerFromApi } from "@/lib/customers-map";
import { useShowroomStore } from "@/lib/offline-store";
import { vehicleFromApi } from "@/lib/vehicles-map";
import {
  installmentContractSchema,
  installmentPaymentSchema,
  type InstallmentContractInput,
  type InstallmentPaymentInput
} from "@/lib/validation";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const apiInstallmentsEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

function readSessionUser(): ClientUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("br_user");
    return raw ? (JSON.parse(raw) as ClientUser) : null;
  } catch {
    return null;
  }
}

const emptyContract: InstallmentContractInput = {
  customerId: "",
  vehicleId: "",
  totalAmount: 0,
  downPayment: 0,
  installmentCount: 12,
  startDate: new Date().toISOString().slice(0, 10),
  intervalDays: 30
};

export function InstallmentsModule() {
  const storeInstallments = useShowroomStore((s) => s.installments);
  const recordInstallmentPayment = useShowroomStore((s) => s.recordInstallmentPayment);
  const deleteInstallment = useShowroomStore((s) => s.deleteInstallment);
  const storeCustomers = useShowroomStore((s) => s.customers);
  const storeVehicles = useShowroomStore((s) => s.vehicles);
  const { log, items } = useActionLog();
  const [sessionUser] = useState(readSessionUser);
  const [apiInstallments, setApiInstallments] = useState<Installment[] | null>(null);
  const [apiContracts, setApiContracts] = useState<InstallmentContractApi[] | null>(null);
  const [apiCustomers, setApiCustomers] = useState<Customer[] | null>(null);
  const [apiVehicles, setApiVehicles] = useState<Vehicle[] | null>(null);
  const [fetching, setFetching] = useState(apiInstallmentsEnabled);
  const [loading, setLoading] = useState(false);
  const [statementCustomerId, setStatementCustomerId] = useState("");

  const paymentForm = useForm<InstallmentPaymentInput>({
    defaultValues: { installmentId: "", amount: 0 }
  });
  const contractForm = useForm<InstallmentContractInput>({ defaultValues: emptyContract });

  const canAdjustPayments = canUsePermission(sessionUser, "installment.adjust");

  const installments =
    apiInstallmentsEnabled && apiInstallments !== null ? apiInstallments : storeInstallments;
  const customers = apiInstallmentsEnabled && apiCustomers !== null ? apiCustomers : storeCustomers;
  const vehicles = apiInstallmentsEnabled && apiVehicles !== null ? apiVehicles : storeVehicles;

  const loadData = useCallback(async () => {
    if (!apiInstallmentsEnabled) return;
    setFetching(true);
    try {
      const scheduleQuery = statementCustomerId
        ? `?customer_id=${encodeURIComponent(statementCustomerId)}`
        : "";
      const [schedRes, contractRes, custRes, vehRes] = await Promise.all([
        fetch(`/api/installments/schedule${scheduleQuery}`, { credentials: "include" }),
        fetch("/api/installments/contracts", { credentials: "include" }),
        fetch("/api/customers", { credentials: "include" }),
        fetch("/api/vehicles", { credentials: "include" })
      ]);
      const schedData = (await schedRes.json()) as {
        installments?: unknown[];
        error?: string;
      };
      const contractData = (await contractRes.json()) as {
        contracts?: unknown[];
        error?: string;
      };
      const custData = (await custRes.json()) as { customers?: unknown[]; error?: string };
      const vehData = (await vehRes.json()) as { vehicles?: unknown[]; error?: string };
      if (!schedRes.ok) throw new Error(schedData.error ?? "تعذر تحميل الأقساط");
      if (!contractRes.ok) throw new Error(contractData.error ?? "تعذر تحميل العقود");
      if (!custRes.ok) throw new Error(custData.error ?? "تعذر تحميل العملاء");
      if (!vehRes.ok) throw new Error(vehData.error ?? "تعذر تحميل السيارات");
      const rows = (schedData.installments ?? []) as Installment[];
      setApiInstallments(rows);
      setApiContracts(
        (contractData.contracts ?? []).map((row) =>
          contractFromApi(row as Record<string, unknown>)
        )
      );
      setApiCustomers(
        (custData.customers ?? []).map((row) =>
          customerFromApi(row as Record<string, unknown>)
        )
      );
      setApiVehicles(
        (vehData.vehicles ?? []).map((row) => vehicleFromApi(row as Record<string, unknown>))
      );
      paymentForm.setValue("installmentId", rows[0]?.id ?? "");
    } finally {
      setFetching(false);
    }
  }, [paymentForm, statementCustomerId]);

  useEffect(() => {
    if (!apiInstallmentsEnabled) return;
    const t = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(t);
  }, [loadData]);

  const overdue = useMemo(
    () => installments.filter((i) => i.status === "overdue"),
    [installments]
  );

  const primaryContract = apiContracts?.[0];
  const contractNumber = primaryContract?.contractNumber ?? `INST-${installments[0]?.id ?? "NEW"}`;
  const totalRemaining = installments.reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  const initialSchedule = installmentsToScheduleRows(installments);

  const customerNameForContract = primaryContract?.customerName
    ?? customers.find((c) => c.id === installments[0]?.customerId)?.name
    ?? "عميل — راجع بيانات العقد في النظام";

  function buildContractHtml(rows: ReturnType<typeof installmentsToScheduleRows>) {
    return buildInstallmentContractPrintHtml({
      contractNumber,
      totalAmount: primaryContract?.totalAmount ?? totalRemaining,
      customerName: customerNameForContract,
      downPayment: primaryContract?.downPayment ?? 0,
      installmentCount: rows.length,
      scheduleRows: rows
    });
  }

  const reportHtml = buildTableReportHtml(
    "جدول الأقساط",
    ["القسط", "المبلغ", "المدفوع", "الاستحقاق", "الحالة"],
    installments.map((i) => [
      i.id.slice(0, 8),
      formatCurrency(i.amount),
      formatCurrency(i.paidAmount),
      formatDateTime(i.dueDate),
      i.status
    ])
  );

  const overdueHtml = buildTableReportHtml(
    "الأقساط المتأخرة",
    ["القسط", "المبلغ", "المدفوع", "الاستحقاق"],
    overdue.map((i) => [
      i.id.slice(0, 8),
      formatCurrency(i.amount),
      formatCurrency(i.paidAmount),
      formatDateTime(i.dueDate)
    ])
  );

  return (
    <ModulePage moduleKey="installments">
      {apiInstallmentsEnabled && fetching && (
        <p className="text-sm text-white/50">{ar.loading}</p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">إجمالي الأقساط</p>
          <p className="mt-2 text-2xl font-black">{installments.length}</p>
        </article>
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">متأخرة</p>
          <p className="mt-2 text-2xl font-black text-amber-200">{overdue.length}</p>
        </article>
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">مدفوعة</p>
          <p className="mt-2 text-2xl font-black text-emerald-200">
            {installments.filter((i) => i.status === "paid").length}
          </p>
        </article>
      </section>

      {apiInstallmentsEnabled && (
        <section className="luxury-panel rounded-[2rem] p-5">
          <h3 className="font-bold text-white">إنشاء عقد تقسيط</h3>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={contractForm.handleSubmit(async (data) => {
              setLoading(true);
              const parsed = installmentContractSchema.safeParse(data);
              if (!parsed.success) {
                log(parsed.error.issues[0]?.message ?? ar.error);
                setLoading(false);
                return;
              }
              try {
                const res = await fetch("/api/installments/contracts", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(parsed.data)
                });
                const payload = (await res.json()) as { error?: string; contract?: InstallmentContractApi };
                if (!res.ok) throw new Error(payload.error ?? "تعذر إنشاء العقد");
                log(`تم إنشاء عقد ${payload.contract?.contractNumber ?? ""}.`);
                contractForm.reset({
                  ...emptyContract,
                  startDate: new Date().toISOString().slice(0, 10)
                });
                await loadData();
              } catch (e) {
                log(e instanceof Error ? e.message : ar.error);
              } finally {
                setLoading(false);
              }
            })}
          >
            <SelectCustomer
              label="العميل"
              customers={customers}
              register={contractForm.register("customerId")}
            />
            <SelectVehicle
              label="السيارة"
              vehicles={vehicles}
              register={contractForm.register("vehicleId")}
            />
            <Field label="إجمالي العقد">
              <input type="number" className={inputClass} {...contractForm.register("totalAmount")} />
            </Field>
            <Field label="الدفعة المقدمة">
              <input type="number" className={inputClass} {...contractForm.register("downPayment")} />
            </Field>
            <Field label="عدد الأقساط">
              <input
                type="number"
                className={inputClass}
                {...contractForm.register("installmentCount")}
              />
            </Field>
            <Field label="تاريخ البدء">
              <input type="date" className={inputClass} {...contractForm.register("startDate")} />
            </Field>
            <Field label="فترة بين الأقساط (يوم)">
              <input type="number" className={inputClass} {...contractForm.register("intervalDays")} />
            </Field>
            <div className="md:col-span-2">
              <PrimaryButton type="submit" disabled={loading}>
                {loading ? ar.loading : "إنشاء عقد التقسيط"}
              </PrimaryButton>
            </div>
          </form>
          {apiContracts && apiContracts.length > 0 && (
            <p className="mt-3 text-xs text-white/45">
              عقود نشطة: {apiContracts.map((c) => c.contractNumber).join("، ")}
            </p>
          )}
        </section>
      )}

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">كشف حساب عميل</h3>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="العميل">
            <select
              className={inputClass}
              value={statementCustomerId}
              onChange={(e) => setStatementCustomerId(e.target.value)}
            >
              <option value="">كل الأقساط</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {apiInstallmentsEnabled && (
            <PrimaryButton type="button" onClick={() => void loadData()} disabled={fetching}>
              تحديث الكشف
            </PrimaryButton>
          )}
        </div>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">تسجيل دفعة قسط</h3>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={paymentForm.handleSubmit(async (data) => {
            setLoading(true);
            const parsed = installmentPaymentSchema.safeParse(data);
            if (!parsed.success) {
              log(parsed.error.issues[0]?.message ?? ar.error);
              setLoading(false);
              return;
            }
            if (apiInstallmentsEnabled) {
              try {
                const res = await fetch("/api/installments/payments", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(parsed.data)
                });
                const payload = (await res.json()) as { error?: string };
                if (!res.ok) throw new Error(payload.error ?? "تعذر تسجيل الدفعة");
                log(`تم تسجيل دفعة ${formatCurrency(parsed.data.amount)}.`);
                paymentForm.reset({ installmentId: installments[0]?.id ?? "", amount: 0 });
                await loadData();
              } catch (e) {
                log(e instanceof Error ? e.message : ar.error);
              }
            } else {
              recordInstallmentPayment(parsed.data);
              log(`تم تسجيل دفعة ${formatCurrency(parsed.data.amount)}.`);
              paymentForm.reset({ installmentId: installments[0]?.id ?? "", amount: 0 });
            }
            setLoading(false);
          })}
        >
          <Field label="القسط">
            <select className={inputClass} {...paymentForm.register("installmentId")}>
              {installments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.id.slice(0, 8)} — {formatCurrency(i.amount - i.paidAmount)} متبقي ({i.status})
                </option>
              ))}
            </select>
          </Field>
          <Field label="المبلغ">
            <input type="number" className={inputClass} {...paymentForm.register("amount")} />
          </Field>
          <div className="md:col-span-2">
            <PrimaryButton type="submit" disabled={loading || installments.length === 0}>
              {loading ? ar.loading : "تسجيل الدفعة"}
            </PrimaryButton>
          </div>
        </form>
        {!apiInstallmentsEnabled && !canAdjustPayments && (
          <p className="mt-2 text-xs text-white/40">
            حذف القسط من السجل المحلي متاح دون ربط API.
          </p>
        )}
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">جدول الأقساط</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <PrintDocumentActions
            title="عقد تقسيط"
            getHtml={() => buildContractHtml(initialSchedule)}
            scheduleEditor={{
              initialSchedule,
              buildHtml: (rows) => buildContractHtml(rows)
            }}
          />
        </div>
        <PrintToolbar
          title="أقساط"
          printHtmlBody={reportHtml}
          csvFilename="installments.csv"
          csvHeaders={["القسط", "المبلغ", "الحالة"]}
          csvRows={installments.map((i) => [i.id, i.amount, i.status])}
        />
        {overdue.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            تنبيه: {overdue.length} قسط متأخر — راجع المتابعة مع العملاء.
          </div>
        )}
        {overdue.length > 0 && (
          <div className="mt-3">
            <PrintToolbar title="أقساط متأخرة" printHtmlBody={overdueHtml} />
          </div>
        )}
        <div className="mt-4 overflow-x-auto">
          {installments.length === 0 ? (
            <EmptyState title={ar.noData} />
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="py-2 text-start">القسط</th>
                  <th className="text-start">المبلغ</th>
                  <th className="text-start">المدفوع</th>
                  <th className="text-start">المتبقي</th>
                  <th className="text-start">الاستحقاق</th>
                  <th className="text-start">الحالة</th>
                  <th className="text-start">{ar.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {installments.map((i) => (
                  <tr key={i.id}>
                    <td className="py-3 font-mono text-xs">{i.id.slice(0, 8)}</td>
                    <td>{formatCurrency(i.amount)}</td>
                    <td>{formatCurrency(i.paidAmount)}</td>
                    <td>{formatCurrency(i.amount - i.paidAmount)}</td>
                    <td>{formatDateTime(i.dueDate)}</td>
                    <td>
                      <StatusBadge status={i.status} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <PrintDocumentActions
                          title={`إيصال ${i.id.slice(0, 8)}`}
                          getHtml={() =>
                            buildPaymentReceiptPrintHtml({
                              receiptNumber: `RCP-${i.id.slice(0, 8)}`,
                              amount: i.paidAmount > 0 ? i.paidAmount : i.amount,
                              reference: i.id.slice(0, 8),
                              note: "إيصال دفع قسط"
                            })
                          }
                        />
                        {!apiInstallmentsEnabled && (
                          <button
                            type="button"
                            className="rounded-lg border border-white/15 px-2 py-1 text-xs text-white/70"
                            onClick={() => {
                              const result = deleteInstallment(i.id);
                              if (!result.ok) window.alert(result.message);
                              else log(`حذف القسط ${i.id.slice(0, 8)}`);
                            }}
                          >
                            حذف
                          </button>
                        )}
                      </div>
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
