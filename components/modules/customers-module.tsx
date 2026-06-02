"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ar, moduleTitlesAr } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { EmptyState, Field, PrimaryButton, SecondaryButton, inputClass } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<
    Array<{ id: string; kind: string; title: string; body?: string; author?: string; created_at: string }>
  >([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [noteBody, setNoteBody] = useState("");
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

  const loadTimeline = useCallback(
    async (customerId: string) => {
      if (!apiCustomersEnabled) return;
      setTimelineLoading(true);
      try {
        const res = await fetch(`/api/workspace/customers/${customerId}/timeline`, {
          credentials: "include"
        });
        const data = (await res.json()) as {
          events?: typeof timeline;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "تعذر تحميل السجل");
        setTimeline(data.events ?? []);
      } catch (e) {
        log(e instanceof Error ? e.message : "تعذر تحميل السجل");
        setTimeline([]);
      } finally {
        setTimelineLoading(false);
      }
    },
    [log]
  );

  async function selectCustomer(customer: Customer) {
    setSelectedId(customer.id);
    setNoteBody("");
    await loadTimeline(customer.id);
  }

  async function addNote() {
    if (!selectedId || !noteBody.trim()) return;
    if (!apiCustomersEnabled) {
      log("يتطلب ربط API لإضافة ملاحظات على الخادم.");
      return;
    }
    try {
      const res = await fetch(`/api/customers/${selectedId}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteBody.trim() })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "تعذر حفظ الملاحظة");
      log("تمت إضافة الملاحظة.");
      setNoteBody("");
      await loadTimeline(selectedId);
    } catch (e) {
      log(e instanceof Error ? e.message : "تعذر حفظ الملاحظة");
    }
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
                  <tr
                    key={c.id}
                    className={selectedId === c.id ? "bg-[#d6a84f]/10" : undefined}
                  >
                    <td className="py-3">
                      <button
                        type="button"
                        className="font-bold text-white hover:text-[#f3c96b]"
                        onClick={() => void selectCustomer(c)}
                      >
                        {c.name}
                      </button>
                    </td>
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

      {apiCustomersEnabled && selectedId && (
        <section className="luxury-panel rounded-[2rem] p-5">
          <h3 className="font-bold text-white">الخط الزمني والمتابعة</h3>
          <p className="mt-1 text-sm text-white/55">
            ملاحظات، عملاء محتملون، فواتير، وحجوزات مرتبطة بالعميل.
          </p>
          {timelineLoading ? (
            <p className="mt-4 text-sm text-white/50">جاري التحميل…</p>
          ) : timeline.length === 0 ? (
            <EmptyState title="لا أحداث بعد" hint="أضف ملاحظة للمتابعة." />
          ) : (
            <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto text-sm">
              {timeline.map((ev) => (
                <li key={ev.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="font-semibold text-white">{ev.title}</p>
                  {ev.body && <p className="text-white/60">{ev.body}</p>}
                  {ev.author && <p className="text-xs text-white/40">بواسطة {ev.author}</p>}
                  <p className="text-xs text-white/35">{formatDateTime(ev.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <textarea
              className={inputClass + " min-h-[80px] flex-1"}
              placeholder="ملاحظة متابعة جديدة…"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
          </div>
          <div className="mt-2 flex gap-2">
            <PrimaryButton type="button" onClick={() => void addNote()} disabled={!noteBody.trim()}>
              إضافة ملاحظة
            </PrimaryButton>
            <SecondaryButton onClick={() => setSelectedId(null)}>
              إغلاق
            </SecondaryButton>
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="luxury-panel rounded-2xl p-4 text-sm text-white/60">
          {items[0]}
        </section>
      )}
    </div>
  );
}
