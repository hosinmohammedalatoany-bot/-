"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ar, moduleTitlesAr } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { EmptyState, Field, PrimaryButton, inputClass } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { customerFromApi } from "@/lib/customers-map";
import { customerSchema, type CustomerInput } from "@/lib/validation";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/lib/domain";

const apiCustomersEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

const emptyCustomer: CustomerInput = {
  name: "",
  phone: "",
  email: "",
  address: "",
  idNumber: "",
  notes: ""
};

export function CustomersModule() {
  const storeCustomers = useShowroomStore((s) => s.customers);
  const addCustomerStore = useShowroomStore((s) => s.addCustomer);
  const deleteCustomerStore = useShowroomStore((s) => s.deleteCustomer);
  const { log, items } = useActionLog();
  const [apiCustomers, setApiCustomers] = useState<Customer[] | null>(null);
  const [fetching, setFetching] = useState(apiCustomersEnabled);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const form = useForm<CustomerInput>({ defaultValues: emptyCustomer });

  const customers =
    apiCustomersEnabled && apiCustomers !== null ? apiCustomers : storeCustomers;

  const loadCustomers = useCallback(async () => {
    if (!apiCustomersEnabled) return;
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/customers?${params.toString()}`, { credentials: "include" });
      const data = (await res.json()) as { customers?: unknown[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "تعذر تحميل العملاء");
      setApiCustomers(
        (data.customers ?? []).map((row) => customerFromApi(row as Record<string, unknown>))
      );
    } catch (e) {
      log(e instanceof Error ? e.message : "تعذر تحميل العملاء");
    } finally {
      setFetching(false);
    }
  }, [search, log]);

  useEffect(() => {
    if (!apiCustomersEnabled) return;
    const timer = window.setTimeout(() => void loadCustomers(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  const filtered = useMemo(() => {
    if (apiCustomersEnabled) return customers;
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.idNumber.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const reportRows = filtered.map((c) => [
    c.name,
    c.phone,
    c.email,
    c.idNumber,
    String(c.purchases),
    formatCurrency(c.balance)
  ]);

  async function onSubmit(data: CustomerInput) {
    setLoading(true);
    const parsed = customerSchema.safeParse(data);
    if (!parsed.success) {
      log(parsed.error.issues[0]?.message ?? ar.error);
      setLoading(false);
      return;
    }
    if (apiCustomersEnabled) {
      try {
        const res = await fetch("/api/customers", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data)
        });
        const body = (await res.json()) as { customer?: Customer; error?: string };
        if (!res.ok) throw new Error(body.error ?? "تعذر إضافة العميل");
        log(`تمت إضافة العميل ${body.customer?.name ?? ""}`);
        form.reset(emptyCustomer);
        await loadCustomers();
      } catch (e) {
        log(e instanceof Error ? e.message : "تعذر إضافة العميل");
      }
      setLoading(false);
      return;
    }
    const customer = addCustomerStore(parsed.data);
    log(`تمت إضافة العميل ${customer.name}.`);
    form.reset(emptyCustomer);
    setLoading(false);
  }

  async function removeCustomer(customer: Customer) {
    if (apiCustomersEnabled) {
      try {
        const res = await fetch(`/api/customers/${customer.id}`, {
          method: "DELETE",
          credentials: "include"
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "تعذر أرشفة العميل");
        log(`أُرشف العميل ${customer.name}`);
        await loadCustomers();
      } catch (e) {
        log(e instanceof Error ? e.message : "تعذر أرشفة العميل");
      }
      return;
    }
    const result = deleteCustomerStore(customer.id);
    if (!result.ok) window.alert(result.message);
    else log(`حذف العميل ${customer.name}`);
  }

  return (
    <div className="space-y-5">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h2 className="text-xl font-black text-white">{moduleTitlesAr.customers}</h2>
        <p className="mt-1 text-sm text-white/55">
          إضافة وتعديل العملاء، كشف الحساب، والبحث السريع.
          {apiCustomersEnabled && fetching ? " — جاري التحميل…" : ""}
        </p>
        <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          {(
            [
              ["name", "الاسم الكامل"],
              ["phone", "الهاتف"],
              ["email", "البريد"],
              ["address", "العنوان"],
              ["idNumber", "رقم الهوية"],
              ["notes", "ملاحظات"]
            ] as Array<[keyof CustomerInput, string]>
          ).map(([name, label]) => (
            <Field key={name} label={label}>
              <input className={inputClass} {...form.register(name)} />
            </Field>
          ))}
          <div className="md:col-span-2">
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? ar.loading : ar.add}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className={inputClass + " max-w-sm"}
            placeholder={ar.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <PrintToolbar
            title="تقرير العملاء"
            printHtmlBody={buildTableReportHtml(
              "تقرير العملاء",
              ["الاسم", "الهاتف", "البريد", "الهوية", "المشتريات", "الرصيد"],
              reportRows
            )}
            csvFilename="customers.csv"
            csvHeaders={["الاسم", "الهاتف", "البريد", "الهوية", "المشتريات", "الرصيد"]}
            csvRows={reportRows}
            onPrinted={() => log("تمت طباعة تقرير العملاء.")}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState title={ar.noData} hint="أضف عميلاً من النموذج أعلاه." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="py-3 text-start">الاسم</th>
                  <th className="text-start">الهاتف</th>
                  <th className="text-start">البريد</th>
                  <th className="text-start">الهوية</th>
                  <th className="text-start">المشتريات</th>
                  <th className="text-start">{ar.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 font-bold text-white">{c.name}</td>
                    <td dir="ltr">{c.phone}</td>
                    <td dir="ltr">{c.email}</td>
                    <td>{c.idNumber}</td>
                    <td>{c.purchases}</td>
                    <td className="py-3">
                      <DeleteRowButton onConfirm={() => void removeCustomer(c)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {items.length > 0 && (
        <section className="luxury-panel rounded-2xl p-4 text-sm text-white/60">
          {items[0]}
        </section>
      )}
    </div>
  );
}
