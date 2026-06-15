"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ar } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import {
  dailyCashFromApi,
  expenseFromApi,
  summaryFromApi,
  type DailyCashRegisterApi,
  type FinancialSummaryApi
} from "@/lib/accounting-map";
import { buildProfitLossPrintHtml, buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ModulePage } from "@/components/modules/module-page";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { EmptyState, Field, PrimaryButton, inputClass } from "@/components/ui/primitives";
import { canUsePermission, type ClientUser } from "@/lib/client-permissions";
import { useShowroomMetrics } from "@/hooks/use-showroom-metrics";
import { useShowroomStore } from "@/lib/offline-store";
import { expenseSchema, type ExpenseInput } from "@/lib/validation";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const apiAccountingEnabled = Boolean(
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

const emptyExpense: ExpenseInput = {
  category: "",
  amount: 0,
  branch: "الفرع الرئيسي",
  description: ""
};

export function AccountingModule() {
  const storeExpenses = useShowroomStore((s) => s.expenses);
  const storeInvoices = useShowroomStore((s) => s.invoices);
  const addExpense = useShowroomStore((s) => s.addExpense);
  const deleteExpense = useShowroomStore((s) => s.deleteExpense);
  const metrics = useShowroomMetrics();
  const { log, items } = useActionLog();
  const [sessionUser] = useState(readSessionUser);
  const [apiExpenses, setApiExpenses] = useState<typeof storeExpenses | null>(null);
  const [apiSummary, setApiSummary] = useState<FinancialSummaryApi | null>(null);
  const [apiRegisters, setApiRegisters] = useState<DailyCashRegisterApi[] | null>(null);
  const [fetching, setFetching] = useState(apiAccountingEnabled);
  const [loading, setLoading] = useState(false);
  const form = useForm<ExpenseInput>({ defaultValues: emptyExpense });

  const canDeleteExpense = canUsePermission(sessionUser, "expense.delete");

  const expenses = apiAccountingEnabled && apiExpenses !== null ? apiExpenses : storeExpenses;

  const revenues = useMemo(() => {
    if (apiSummary) return apiSummary.revenue;
    return storeInvoices.reduce((sum, inv) => sum + inv.total - inv.discount + inv.tax, 0);
  }, [apiSummary, storeInvoices]);

  const totalExpenses = apiSummary ? apiSummary.total_expenses : metrics.totalExpenses;
  const netProfit = apiSummary ? apiSummary.net_profit : metrics.actualProfit;

  const loadData = useCallback(async () => {
    if (!apiAccountingEnabled) return;
    setFetching(true);
    try {
      const [expRes, sumRes, cashRes] = await Promise.all([
        fetch("/api/accounting/expenses", { credentials: "include" }),
        fetch("/api/accounting/summary", { credentials: "include" }),
        fetch("/api/accounting/daily-cash", { credentials: "include" })
      ]);
      const expData = (await expRes.json()) as { expenses?: unknown[]; error?: string };
      const sumData = (await sumRes.json()) as { summary?: unknown; error?: string };
      const cashData = (await cashRes.json()) as { registers?: unknown[]; error?: string };
      if (!expRes.ok) throw new Error(expData.error ?? "تعذر تحميل المصروفات");
      if (!sumRes.ok) throw new Error(sumData.error ?? "تعذر تحميل الملخص");
      setApiExpenses(
        (expData.expenses ?? []).map((row) =>
          expenseFromApi(row as Record<string, unknown>)
        )
      );
      if (sumData.summary) {
        setApiSummary(summaryFromApi(sumData.summary as Record<string, unknown>));
      }
      if (cashRes.ok && cashData.registers) {
        setApiRegisters(
          cashData.registers.map((row) =>
            dailyCashFromApi(row as Record<string, unknown>)
          )
        );
      }
    } catch (err) {
      log(err instanceof Error ? err.message : ar.error);
    } finally {
      setFetching(false);
    }
  }, [log]);

  useEffect(() => {
    if (!apiAccountingEnabled) return;
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const reportHtml = buildTableReportHtml(
    "تقرير المصروفات",
    ["الفئة", "المبلغ", "الفرع", "الوصف", "التاريخ"],
    expenses.map((e) => [
      e.category,
      formatCurrency(e.amount),
      e.branch,
      e.description,
      formatDateTime(e.createdAt)
    ])
  );

  const plHtml = buildProfitLossPrintHtml({
    revenues,
    expenses: totalExpenses,
    netProfit,
    periodLabel: "حتى تاريخ الطباعة",
    expenseRows: expenses.map((e) => ({ category: e.category, amount: e.amount }))
  });

  const todayRegister = apiRegisters?.find(
    (r) => r.business_date === new Date().toISOString().slice(0, 10)
  );

  const vehicleProfitRows = apiSummary?.vehicle_profits.filter((v) => v.net_sale > 0) ?? [];

  async function openDailyCash() {
    if (!apiAccountingEnabled) {
      window.alert("الصندوق اليومي يتطلب ربط API.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/accounting/daily-cash", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_name: "الفرع الرئيسي",
          business_date: new Date().toISOString().slice(0, 10),
          opening_balance: 0,
          notes: ""
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "تعذر فتح الصندوق");
      log("تم فتح الصندوق اليومي.");
      await loadData();
    } catch (err) {
      log(err instanceof Error ? err.message : ar.error);
    } finally {
      setLoading(false);
    }
  }

  async function recordCashMovement(direction: "in" | "out") {
    if (!todayRegister || todayRegister.is_closed) {
      window.alert("افتح صندوق اليوم أولاً.");
      return;
    }
    const amountRaw = window.prompt(
      direction === "in" ? "مبلغ الوارد (د.ع)" : "مبلغ الصادر (د.ع)"
    );
    if (!amountRaw) return;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const category =
      window.prompt("التصنيف", direction === "in" ? "إيراد نقدي" : "مصروف نقدي") ?? "";
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/daily-cash/${todayRegister.id}/transactions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          amount,
          category: category || (direction === "in" ? "وارد" : "صادر"),
          reference_label: ""
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "تعذر تسجيل الحركة");
      log(`تم تسجيل حركة ${direction === "in" ? "وارد" : "صادر"}.`);
      await loadData();
    } catch (err) {
      log(err instanceof Error ? err.message : ar.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModulePage moduleKey="accounting">
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">الإيرادات</p>
          <p className="mt-2 text-2xl font-black text-emerald-200">{formatCurrency(revenues)}</p>
        </article>
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">المصروفات</p>
          <p className="mt-2 text-2xl font-black text-red-200">{formatCurrency(totalExpenses)}</p>
        </article>
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">صافي الربح</p>
          <p className="mt-2 text-2xl font-black">{formatCurrency(netProfit)}</p>
        </article>
      </section>

      {apiAccountingEnabled && todayRegister && (
        <section className="luxury-panel rounded-[2rem] p-5">
          <h3 className="font-bold text-white">الصندوق اليومي</h3>
          <p className="mt-1 text-sm text-white/50">
            {todayRegister.business_date} — {todayRegister.branch_name}
            {todayRegister.is_closed ? " (مغلق)" : ""}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            <p>افتتاح: {formatCurrency(todayRegister.opening_balance)}</p>
            <p>وارد: {formatCurrency(todayRegister.totals.cash_in)}</p>
            <p>صادر: {formatCurrency(todayRegister.totals.cash_out)}</p>
            <p className="sm:col-span-3 font-semibold text-amber-200">
              الرصيد المتوقع: {formatCurrency(todayRegister.totals.expected_closing)}
            </p>
          </div>
          {!todayRegister.is_closed && (
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton type="button" disabled={loading} onClick={() => void recordCashMovement("in")}>
                تسجيل وارد
              </PrimaryButton>
              <PrimaryButton type="button" disabled={loading} onClick={() => void recordCashMovement("out")}>
                تسجيل صادر
              </PrimaryButton>
            </div>
          )}
        </section>
      )}

      {apiAccountingEnabled && !todayRegister && !fetching && (
        <section className="luxury-panel rounded-[2rem] p-5">
          <h3 className="font-bold text-white">الصندوق اليومي</h3>
          <p className="mt-2 text-sm text-white/55">لا يوجد صندوق مفتوح لهذا اليوم.</p>
          <PrimaryButton type="button" className="mt-4" disabled={loading} onClick={() => void openDailyCash()}>
            فتح صندوق اليوم
          </PrimaryButton>
        </section>
      )}

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
            if (apiAccountingEnabled) {
              try {
                const res = await fetch("/api/accounting/expenses", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(parsed.data)
                });
                const body = (await res.json()) as { error?: string };
                if (!res.ok) throw new Error(body.error ?? "تعذر الحفظ");
                log(`تم تسجيل مصروف ${parsed.data.category}.`);
                form.reset(emptyExpense);
                await loadData();
              } catch (err) {
                log(err instanceof Error ? err.message : ar.error);
              }
            } else {
              const expense = addExpense(parsed.data);
              log(`تم تسجيل مصروف ${expense.category}.`);
              form.reset(emptyExpense);
            }
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
            <PrimaryButton type="submit" disabled={loading || fetching}>
              {loading ? ar.loading : "حفظ المصروف"}
            </PrimaryButton>
          </div>
        </form>
      </section>

      {vehicleProfitRows.length > 0 && (
        <section className="luxury-panel rounded-[2rem] p-5">
          <h3 className="font-bold text-white">ربح السيارات المباعة</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="py-2 text-start">المركبة</th>
                  <th className="text-start">صافي البيع</th>
                  <th className="text-start">التكلفة</th>
                  <th className="text-start">الربح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {vehicleProfitRows.slice(0, 20).map((row) => (
                  <tr key={row.vehicle_id}>
                    <td className="py-3">
                      {row.internal_number} — {row.manufacturer} {row.model}
                    </td>
                    <td>{formatCurrency(row.net_sale)}</td>
                    <td>{formatCurrency(row.total_cost)}</td>
                    <td className={row.profit >= 0 ? "text-emerald-300" : "text-red-300"}>
                      {formatCurrency(row.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">المصروفات والتقارير</h3>
        <div className="flex flex-wrap gap-2">
          <PrintToolbar
            title="مصروفات"
            printHtmlBody={reportHtml}
            csvFilename="expenses.csv"
            csvHeaders={["الفئة", "المبلغ"]}
            csvRows={expenses.map((e) => [e.category, e.amount])}
          />
          <PrintToolbar title="أرباح وخسائر" printHtmlBody={plHtml} />
        </div>
        <div className="mt-4 overflow-x-auto">
          {fetching ? (
            <p className="text-sm text-white/50">{ar.loading}</p>
          ) : expenses.length === 0 ? (
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
                      {(canDeleteExpense || !apiAccountingEnabled) && (
                        <DeleteRowButton
                          onConfirm={async () => {
                            if (apiAccountingEnabled) {
                              const res = await fetch(`/api/accounting/expenses/${e.id}`, {
                                method: "DELETE",
                                credentials: "include"
                              });
                              if (!res.ok) {
                                const body = (await res.json()) as { error?: string };
                                window.alert(body.error ?? "تعذر الحذف");
                                return;
                              }
                              log(`حذف مصروف ${e.category}`);
                              await loadData();
                            } else {
                              const result = deleteExpense(e.id);
                              if (!result.ok) window.alert(result.message);
                              else log(`حذف مصروف ${e.category}`);
                            }
                          }}
                        />
                      )}
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
