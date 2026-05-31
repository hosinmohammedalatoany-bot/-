"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ar, moduleTitlesAr } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { EmptyState, Field, PrimaryButton, StatusBadge, inputClass } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { leadSchema, type LeadInput } from "@/lib/validation";
import { formatDateTime } from "@/lib/utils";
import type { Lead } from "@/lib/domain";
import { ModulePage } from "@/components/modules/module-page";

const emptyLead: LeadInput = {
  name: "",
  phone: "",
  source: "WhatsApp",
  assignedTo: "",
  vehicleId: "",
  note: ""
};

const statusLabels: Record<Lead["status"], string> = {
  new: ar.leadStatus.new,
  contacted: "تم التواصل",
  interested: ar.leadStatus.interested,
  converted: ar.leadStatus.converted
};

export function LeadsModule() {
  const leads = useShowroomStore((s) => s.leads);
  const vehicles = useShowroomStore((s) => s.vehicles);
  const addLead = useShowroomStore((s) => s.addLead);
  const { log, items } = useActionLog();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const form = useForm<LeadInput>({ defaultValues: emptyLead });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.source.toLowerCase().includes(q) ||
        l.assignedTo.toLowerCase().includes(q)
    );
  }, [leads, search]);

  const reportHtml = buildTableReportHtml(
    "تقرير العملاء المحتملين",
    ["الاسم", "الهاتف", "المصدر", "الحالة", "المتابعة"],
    filtered.map((l) => [l.name, l.phone, l.source, statusLabels[l.status], formatDateTime(l.nextFollowUp)])
  );

  return (
    <ModulePage moduleKey="leads">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">إضافة عميل محتمل</h3>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (data) => {
            setLoading(true);
            const parsed = leadSchema.safeParse(data);
            if (!parsed.success) {
              log(parsed.error.issues[0]?.message ?? ar.error);
              setLoading(false);
              return;
            }
            const lead = addLead(parsed.data);
            log(`تم تسجيل العميل المحتمل ${lead.name} من ${lead.source}.`);
            form.reset(emptyLead);
            setLoading(false);
          })}
        >
          <Field label="الاسم">
            <input className={inputClass} {...form.register("name")} />
          </Field>
          <Field label="الهاتف">
            <input className={inputClass} {...form.register("phone")} />
          </Field>
          <Field label="المصدر">
            <select className={inputClass} {...form.register("source")}>
              {(["WhatsApp", "Facebook", "Instagram", "Walk-In", "Phone Call"] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="مسند إلى">
            <input className={inputClass} {...form.register("assignedTo")} />
          </Field>
          <Field label="السيارة">
            <select className={inputClass} {...form.register("vehicleId")}>
              <option value="">—</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.internalNumber} — {v.manufacturer} {v.model}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ملاحظة">
            <input className={inputClass} {...form.register("note")} />
          </Field>
          <div className="md:col-span-2">
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? ar.loading : "حفظ Lead"}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-white">{moduleTitlesAr.leads}</h3>
          <input
            className={inputClass + " max-w-xs"}
            placeholder={ar.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <PrintToolbar
          title="عملاء محتملون"
          printHtmlBody={reportHtml}
          csvFilename="leads.csv"
          csvHeaders={["الاسم", "الهاتف", "المصدر", "الحالة"]}
          csvRows={filtered.map((l) => [l.name, l.phone, l.source, statusLabels[l.status]])}
        />
        <div className="mt-4 overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState title={ar.noData} />
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="py-2 text-start">الاسم</th>
                  <th className="text-start">الهاتف</th>
                  <th className="text-start">المصدر</th>
                  <th className="text-start">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 font-semibold text-white">{l.name}</td>
                    <td dir="ltr">{l.phone}</td>
                    <td>{l.source}</td>
                    <td>
                      <StatusBadge status={statusLabels[l.status]} />
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
