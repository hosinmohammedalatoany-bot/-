"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ar, moduleTitlesAr } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import {
  EmptyState,
  Field,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  inputClass
} from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { leadFromApi, type LeadNoteRecord } from "@/lib/customers-map";
import { leadSchema, type LeadInput } from "@/lib/validation";
import { formatDateTime } from "@/lib/utils";
import type { Lead, LeadPipelineStatus } from "@/lib/domain";
import { ModulePage } from "@/components/modules/module-page";

const apiLeadsEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

const emptyLead: LeadInput = {
  name: "",
  phone: "",
  source: "WhatsApp",
  assignedTo: "",
  vehicleId: "",
  note: ""
};

const pipelineStatuses: LeadPipelineStatus[] = [
  "interested",
  "contact",
  "reserved",
  "purchased",
  "cancelled"
];

const statusLabels: Record<LeadPipelineStatus, string> = {
  interested: ar.leadStatus.interested,
  contact: ar.leadStatus.contact,
  reserved: ar.leadStatus.reserved,
  purchased: ar.leadStatus.purchased,
  cancelled: ar.leadStatus.cancelled
};

type LeadRow = Lead & { timeline?: LeadNoteRecord[] };

export function LeadsModule() {
  const storeLeads = useShowroomStore((s) => s.leads);
  const storeVehicles = useShowroomStore((s) => s.vehicles);
  const addLeadStore = useShowroomStore((s) => s.addLead);
  const deleteLeadStore = useShowroomStore((s) => s.deleteLead);
  const { log, items } = useActionLog();
  const [apiLeads, setApiLeads] = useState<LeadRow[] | null>(null);
  const [apiVehicles, setApiVehicles] = useState<
    Array<{ id: string; internalNumber: string; manufacturer: string; model: string }> | null
  >(null);
  const [fetching, setFetching] = useState(apiLeadsEnabled);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm<LeadInput>({ defaultValues: emptyLead });

  const leads = apiLeadsEnabled && apiLeads !== null ? apiLeads : storeLeads;
  const vehicles =
    apiLeadsEnabled && apiVehicles !== null
      ? apiVehicles
      : storeVehicles.map((v) => ({
          id: v.id,
          internalNumber: v.internalNumber,
          manufacturer: v.manufacturer,
          model: v.model
        }));

  const loadLeads = useCallback(async () => {
    if (!apiLeadsEnabled) return;
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/leads?${params.toString()}`, { credentials: "include" });
      const data = (await res.json()) as { leads?: unknown[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "تعذر تحميل العملاء المحتملين");
      setApiLeads(
        (data.leads ?? []).map((row) => leadFromApi(row as Record<string, unknown>) as LeadRow)
      );
    } catch (e) {
      log(e instanceof Error ? e.message : "تعذر تحميل العملاء المحتملين");
    } finally {
      setFetching(false);
    }
  }, [search, statusFilter, log]);

  const loadVehicles = useCallback(async () => {
    if (!apiLeadsEnabled) return;
    try {
      const res = await fetch("/api/vehicles?status=available", { credentials: "include" });
      const data = (await res.json()) as { vehicles?: Array<Record<string, unknown>> };
      if (!res.ok) return;
      setApiVehicles(
        (data.vehicles ?? []).map((v) => ({
          id: String(v.id),
          internalNumber: String(v.internal_number ?? ""),
          manufacturer: String(v.manufacturer ?? ""),
          model: String(v.model ?? "")
        }))
      );
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    if (!apiLeadsEnabled) return;
    const timer = window.setTimeout(() => {
      void loadLeads();
      void loadVehicles();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadLeads, loadVehicles]);

  const filtered = useMemo(() => {
    if (apiLeadsEnabled) return leads;
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      const matchQ =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.source.toLowerCase().includes(q) ||
        l.assignedTo.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const reportHtml = buildTableReportHtml(
    "تقرير العملاء المحتملين",
    ["الاسم", "الهاتف", "المصدر", "الحالة", "المتابعة"],
    filtered.map((l) => [
      l.name,
      l.phone,
      l.source,
      statusLabels[l.status as LeadPipelineStatus] ?? l.status,
      formatDateTime(l.nextFollowUp)
    ])
  );

  async function onSubmit(data: LeadInput) {
    setLoading(true);
    const parsed = leadSchema.safeParse(data);
    if (!parsed.success) {
      log(parsed.error.issues[0]?.message ?? ar.error);
      setLoading(false);
      return;
    }
    if (apiLeadsEnabled) {
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data)
        });
        const body = (await res.json()) as { lead?: Lead; error?: string };
        if (!res.ok) throw new Error(body.error ?? "تعذر حفظ العميل المحتمل");
        log(`تم تسجيل العميل المحتمل ${body.lead?.name ?? ""}`);
        form.reset(emptyLead);
        await loadLeads();
      } catch (e) {
        log(e instanceof Error ? e.message : "تعذر حفظ العميل المحتمل");
      }
      setLoading(false);
      return;
    }
    const lead = addLeadStore(parsed.data);
    log(`تم تسجيل العميل المحتمل ${lead.name} من ${lead.source}.`);
    form.reset(emptyLead);
    setLoading(false);
  }

  async function changeStatus(leadId: string, status: LeadPipelineStatus) {
    if (apiLeadsEnabled) {
      try {
        const res = await fetch(`/api/leads/${leadId}/status`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "تعذر تحديث الحالة");
        log(`تم تحديث الحالة إلى ${statusLabels[status]}`);
        await loadLeads();
      } catch (e) {
        log(e instanceof Error ? e.message : "تعذر تحديث الحالة");
      }
      return;
    }
    log(`تحديث الحالة محلياً غير مدعوم بعد — استخدم وضع API.`);
  }

  async function addNote(leadId: string) {
    const text = window.prompt("أدخل ملاحظة المتابعة:");
    if (!text?.trim()) return;
    if (apiLeadsEnabled) {
      try {
        const res = await fetch(`/api/leads/${leadId}/notes`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text.trim() })
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "تعذر إضافة الملاحظة");
        log("تمت إضافة ملاحظة المتابعة.");
        const detail = await fetch(`/api/leads/${leadId}`, { credentials: "include" });
        const detailBody = (await detail.json()) as { lead?: Record<string, unknown> };
        if (detail.ok && detailBody.lead) {
          const updated = leadFromApi(detailBody.lead) as LeadRow;
          setApiLeads((prev) =>
            prev ? prev.map((l) => (l.id === leadId ? updated : l)) : prev
          );
        } else {
          await loadLeads();
        }
      } catch (e) {
        log(e instanceof Error ? e.message : "تعذر إضافة الملاحظة");
      }
      return;
    }
    log("سجل الملاحظات يتطلب ربط API.");
  }

  async function removeLead(lead: Lead) {
    if (apiLeadsEnabled) {
      try {
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: "DELETE",
          credentials: "include"
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "تعذر أرشفة العميل المحتمل");
        log(`أُرشف العميل المحتمل ${lead.name}`);
        await loadLeads();
      } catch (e) {
        log(e instanceof Error ? e.message : "تعذر أرشفة العميل المحتمل");
      }
      return;
    }
    const result = deleteLeadStore(lead.id);
    if (!result.ok) window.alert(result.message);
    else log(`حذف العميل المحتمل ${lead.name}`);
  }

  return (
    <ModulePage moduleKey="leads">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">إضافة عميل محتمل</h3>
        {apiLeadsEnabled && fetching ? (
          <p className="mt-1 text-xs text-white/45">جاري تحميل القائمة…</p>
        ) : null}
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="الاسم">
            <input className={inputClass} {...form.register("name")} />
          </Field>
          <Field label="الهاتف">
            <input className={inputClass} {...form.register("phone")} />
          </Field>
          <Field label="المصدر">
            <select className={inputClass} {...form.register("source")}>
              {(["WhatsApp", "Facebook", "Instagram", "Walk-In", "Phone Call"] as const).map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}
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
          <div className="flex flex-wrap gap-2">
            <input
              className={inputClass + " max-w-xs"}
              placeholder={ar.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={inputClass + " max-w-[10rem]"}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">كل الحالات</option>
              {pipelineStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <PrintToolbar
          title="عملاء محتملون"
          printHtmlBody={reportHtml}
          csvFilename="leads.csv"
          csvHeaders={["الاسم", "الهاتف", "المصدر", "الحالة"]}
          csvRows={filtered.map((l) => [
            l.name,
            l.phone,
            l.source,
            statusLabels[l.status as LeadPipelineStatus] ?? l.status
          ])}
        />
        <div className="mt-4 overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState title={ar.noData} />
          ) : (
            <table className="w-full min-w-[800px] text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="py-2 text-start">الاسم</th>
                  <th className="text-start">الهاتف</th>
                  <th className="text-start">المصدر</th>
                  <th className="text-start">الحالة</th>
                  <th className="text-start">المتابعة</th>
                  <th className="text-start">{ar.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((l) => {
                  const row = l as LeadRow;
                  const expanded = expandedId === l.id;
                  return (
                    <Fragment key={l.id}>
                      <tr>
                        <td className="py-3 font-semibold text-white">{l.name}</td>
                        <td dir="ltr">{l.phone}</td>
                        <td>{l.source}</td>
                        <td>
                          {apiLeadsEnabled ? (
                            <select
                              className={inputClass + " min-w-[7rem] py-1 text-xs"}
                              value={l.status}
                              onChange={(e) =>
                                void changeStatus(l.id, e.target.value as LeadPipelineStatus)
                              }
                            >
                              {pipelineStatuses.map((s) => (
                                <option key={s} value={s}>
                                  {statusLabels[s]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <StatusBadge status={l.status} label={statusLabels[l.status]} />
                          )}
                        </td>
                        <td className="text-xs text-white/55">{formatDateTime(l.nextFollowUp)}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <SecondaryButton onClick={() => setExpandedId(expanded ? null : l.id)}>
                              {expanded ? "إخفاء" : "سجل"}
                            </SecondaryButton>
                            <SecondaryButton onClick={() => void addNote(l.id)}>
                              ملاحظة
                            </SecondaryButton>
                            <DeleteRowButton onConfirm={() => void removeLead(l)} />
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} className="bg-black/30 px-4 py-3">
                            <p className="text-xs text-white/50">ملاحظة أولية: {l.note || "—"}</p>
                            <ul className="mt-2 space-y-1 text-xs text-white/70">
                              {(row.timeline ?? []).length === 0 ? (
                                <li>لا توجد ملاحظات متابعة بعد.</li>
                              ) : (
                                row.timeline!.map((n) => (
                                  <li key={n.id}>
                                    <span className="text-white/40">
                                      {formatDateTime(n.createdAt)}
                                      {n.authorName ? ` — ${n.authorName}` : ""}:{" "}
                                    </span>
                                    {n.body}
                                  </li>
                                ))
                              )}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
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
