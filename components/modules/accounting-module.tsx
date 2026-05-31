"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ar } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import { buildProfitLossPrintHtml, buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ModulePage } from "@/components/modules/module-page";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { EmptyState, Field, PrimaryButton, inputClass } from "@/components/ui/primitives";
import { useShowroomMetrics } from "@/hooks/use-showroom-metrics";
import { useShowroomStore } from "@/lib/offline-store";
import { expenseSchema, type ExpenseInput } from "@/lib/validation";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const emptyExpense: ExpenseInput = {
  category: "",
  amount: 0,
  branch: "الفرع الرئيسي",
  description: ""
};

export function AccountingModule() {
  const expenses = useShowroomStore((s) => s.expenses);
  const invoices = useShowroomStore((s) => s.invoices);
  const addExpense = useShowroomStore((s) => s.addExpense);
  const deleteExpense = useShowroomStore((s) => s.deleteExpense);
  const metrics = useShowroomMetrics();
  const { log, items } = useActionLog();
  const [loading, setLoading] = useState(false);
  const form = useForm<ExpenseInput>({ defaultValues: emptyExpense });

  const revenues = useMemo(
    () => invoices.reduce((sum, inv) => sum + inv.total - inv.discount + inv.tax, 0),
    [invoices]
  );

  const reportHtml = buildTableReportHtml(
    "تقرير المصروفات",
    ["الفئة", "المبلغ", "الفرع", "الوصف", "التاريخ"],
    expenses.map((e) => [e.category, formatCurrency(e.amount), e.branch, e.description, formatDateTime(e.createdAt)])
  );

  const plHtml = buildProfitLossPrintHtml({
    revenues,
    expenses: metrics.totalExpenses,
    netProfit: metrics.actualProfit,
    periodLabel: "حتى تاريخ الطباعة",
    expenseRows: expenses.map((e) => ({ category: e.category, amount: e.amount }))
  });

  return (
    <ModulePage moduleKey="accounting">
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">الإيرادات</p>
          <p className="mt-2 text-2xl font-black text-emerald-200">{formatCurrency(revenues)}</p>
        </article>
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">المصروفات</p>
          <p className="mt-2 text-2xl font-black text-red-200">{metrics.formatted.totalExpenses}</p>
        </article>
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">صافي الربح</p>
          <p className="mt-2 text-2xl font-black">{metrics.formatted.actualProfit}</p>
        </article>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">تسجيل مصروف</h3>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (data) => {
            setLoading(true);
            const parsed = expenseSchema.safeParse(data);
            if (!parsed.success) {
              log(parsed.error.issues[0]?.message ?? ar.error);
              setLoading(false);
              return;
            }
            const expense = addExpense(parsed.data);
            log(`تم تسجيل مصروف ${expense.category}.`);
            form.reset(emptyExpense);
            setLoading(false);
          })}
        >
          <Field label="الفئة">
            <input className={inputClass} {...form.register("category")} />
          </Field>
          <Field label="المبلغ">
            <input type="number" className={inputClass} {...form.register("amount")} />
          </Field>
          <Field label="الفرع">
            <input className={inputClass} {...form.register("branch")} />
          </Field>
          <Field label="الوصف">
            <input className={inputClass} {...form.register("description")} />
          </Field>
          <div className="md:col-span-2">
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? ar.loading : "حفظ المصروف"}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">المصروفات والتقارير</h3>
        <div className="flex flex-wrap gap-2">
          <PrintToolbar title="مصروفات" printHtmlBody={reportHtml} csvFilename="expenses.csv" csvHeaders={["الفئة", "المبلغ"]} csvRows={expenses.map((e) => [e.category, e.amount])} />
          <PrintToolbar title="أرباح وخسائر" printHtmlBody={plHtml} />
        </div>
        <div className="mt-4 overflow-x-auto">
          {expenses.length === 0 ? (
            <EmptyState title={ar.noData} />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="py-2 text-start">الفئة</th>
                  <th className="text-start">المبلغ</th>
                  <th className="text-start">الفرع</th>
                  <th className="text-start">التاريخ</th>
                  <th className="text-start">{ar.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3">{e.category}</td>
                    <td>{formatCurrency(e.amount)}</td>
                    <td>{e.branch}</td>
                    <td>{formatDateTime(e.createdAt)}</td>
                    <td className="py-3">
                      <DeleteRowButton
                        onConfirm={() => {
                          const result = deleteExpense(e.id);
                          if (!result.ok) window.alert(result.message);
                          else log(`حذف مصروف ${e.category}`);
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
