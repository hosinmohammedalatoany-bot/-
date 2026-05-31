"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ar, moduleTitlesAr } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { EmptyState, Field, PrimaryButton, inputClass } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { customerSchema, type CustomerInput } from "@/lib/validation";
import { formatCurrency } from "@/lib/utils";

const emptyCustomer: CustomerInput = {
  name: "",
  phone: "",
  email: "",
  address: "",
  idNumber: "",
  notes: ""
};

export function CustomersModule() {
  const customers = useShowroomStore((s) => s.customers);
  const addCustomer = useShowroomStore((s) => s.addCustomer);
  const deleteCustomer = useShowroomStore((s) => s.deleteCustomer);
  const { log, items } = useActionLog();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const form = useForm<CustomerInput>({ defaultValues: emptyCustomer });

  const filtered = useMemo(() => {
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

  return (
    <div className="space-y-5">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h2 className="text-xl font-black text-white">{moduleTitlesAr.customers}</h2>
        <p className="mt-1 text-sm text-white/55">إضافة وتعديل العملاء، كشف الحساب، والبحث السريع.</p>
        <form
          className="mt-5 grid gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (data) => {
            setLoading(true);
            const parsed = customerSchema.safeParse(data);
            if (!parsed.success) {
              log(parsed.error.issues[0]?.message ?? ar.error);
              setLoading(false);
              return;
            }
            const customer = addCustomer(parsed.data);
            log(`تمت إضافة العميل ${customer.name}.`);
            form.reset(emptyCustomer);
            setLoading(false);
          })}
        >
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
                      <DeleteRowButton
                        onConfirm={() => {
                          const result = deleteCustomer(c.id);
                          if (!result.ok) window.alert(result.message);
                          else log(`حذف العميل ${c.name}`);
                        }}
                      />
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
