"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ar } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ModulePage } from "@/components/modules/module-page";
import { EmptyState, Field, PrimaryButton, StatusBadge, inputClass } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { installmentPaymentSchema, type InstallmentPaymentInput } from "@/lib/validation";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function InstallmentsModule() {
  const installments = useShowroomStore((s) => s.installments);
  const recordInstallmentPayment = useShowroomStore((s) => s.recordInstallmentPayment);
  const { log, items } = useActionLog();
  const [loading, setLoading] = useState(false);
  const form = useForm<InstallmentPaymentInput>({
    defaultValues: { installmentId: installments[0]?.id ?? "", amount: 0 }
  });

  const overdue = useMemo(() => installments.filter((i) => i.status === "overdue"), [installments]);

  const reportHtml = buildTableReportHtml(
    "جدول الأقساط",
    ["القسط", "المبلغ", "المدفوع", "الاستحقاق", "الحالة"],
    installments.map((i) => [
      i.id,
      formatCurrency(i.amount),
      formatCurrency(i.paidAmount),
      formatDateTime(i.dueDate),
      i.status
    ])
  );

  const overdueHtml = buildTableReportHtml(
    "الأقساط المتأخرة",
    ["القسط", "المبلغ", "المدفوع", "الاستحقاق"],
    overdue.map((i) => [i.id, formatCurrency(i.amount), formatCurrency(i.paidAmount), formatDateTime(i.dueDate)])
  );

  return (
    <ModulePage moduleKey="installments">
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

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">تسجيل دفعة قسط</h3>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (data) => {
            setLoading(true);
            const parsed = installmentPaymentSchema.safeParse(data);
            if (!parsed.success) {
              log(parsed.error.issues[0]?.message ?? ar.error);
              setLoading(false);
              return;
            }
            recordInstallmentPayment(parsed.data);
            log(`تم تسجيل دفعة ${formatCurrency(parsed.data.amount)}.`);
            form.reset({ installmentId: installments[0]?.id ?? "", amount: 0 });
            setLoading(false);
          })}
        >
          <Field label="القسط">
            <select className={inputClass} {...form.register("installmentId")}>
              {installments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.id} — {formatCurrency(i.amount)} ({i.status})
                </option>
              ))}
            </select>
          </Field>
          <Field label="المبلغ">
            <input type="number" className={inputClass} {...form.register("amount")} />
          </Field>
          <div className="md:col-span-2">
            <PrimaryButton type="submit" disabled={loading || installments.length === 0}>
              {loading ? ar.loading : "تسجيل الدفعة"}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">جدول الأقساط</h3>
        <PrintToolbar
          title="أقساط"
          printHtmlBody={reportHtml}
          csvFilename="installments.csv"
          csvHeaders={["القسط", "المبلغ", "الحالة"]}
          csvRows={installments.map((i) => [i.id, i.amount, i.status])}
        />
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
                  <th className="text-start">الاستحقاق</th>
                  <th className="text-start">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {installments.map((i) => (
                  <tr key={i.id}>
                    <td className="py-3">{i.id}</td>
                    <td>{formatCurrency(i.amount)}</td>
                    <td>{formatCurrency(i.paidAmount)}</td>
                    <td>{formatDateTime(i.dueDate)}</td>
                    <td>
                      <StatusBadge status={i.status} />
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
