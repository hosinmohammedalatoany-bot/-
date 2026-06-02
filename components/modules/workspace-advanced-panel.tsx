"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Filter, Sparkles } from "lucide-react";
import { useActionLog } from "@/hooks/use-action-log";
import { Field, PrimaryButton, SecondaryButton, inputClass } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";

const apiEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

type SavedFilterRow = {
  id: string;
  module_key: string;
  name: string;
  query: Record<string, unknown>;
  is_default: boolean;
};

type ArchiveDoc = {
  id: string;
  kind?: string;
  doc_type?: string;
  title: string;
  subtitle?: string;
  vehicle_label?: string;
  vehicle_id?: string;
  href?: string;
  created_at?: string;
};

type PremiumCapability = {
  key: string;
  title: string;
  status: string;
  description: string;
};

export function WorkspaceAdvancedPanel() {
  const { log } = useActionLog();
  const [filters, setFilters] = useState<SavedFilterRow[]>([]);
  const [documents, setDocuments] = useState<ArchiveDoc[]>([]);
  const [premium, setPremium] = useState<{
    enabled: boolean;
    message: string;
    capabilities: PremiumCapability[];
  } | null>(null);
  const [moduleKey, setModuleKey] = useState("cars");
  const [filterName, setFilterName] = useState("");
  const [filterQuery, setFilterQuery] = useState("{}");
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!apiEnabled) return;
    setLoading(true);
    try {
      const [fRes, dRes, pRes] = await Promise.all([
        fetch("/api/workspace/saved-filters", { credentials: "include" }),
        fetch("/api/workspace/documents?limit=40", { credentials: "include" }),
        fetch("/api/premium/capabilities", { credentials: "include" })
      ]);
      if (fRes.ok) {
        const data = (await fRes.json()) as { filters?: SavedFilterRow[] };
        setFilters(data.filters ?? []);
      }
      if (dRes.ok) {
        const data = (await dRes.json()) as { documents?: ArchiveDoc[] };
        setDocuments(
          (data.documents ?? []).map((doc) => ({
            ...doc,
            subtitle:
              doc.subtitle ??
              doc.vehicle_label ??
              (doc.doc_type ? `نوع: ${doc.doc_type}` : undefined),
            href: doc.href ?? (doc.vehicle_id ? `/dashboard/cars` : undefined)
          }))
        );
      }
      if (pRes.ok) {
        setPremium((await pRes.json()) as typeof premium);
      }
    } catch {
      log("تعذر تحميل إعدادات متقدمة من الخادم.");
    } finally {
      setLoading(false);
    }
  }, [log]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadAll]);

  async function saveFilter() {
    if (!apiEnabled) return;
    let query: Record<string, unknown>;
    try {
      query = JSON.parse(filterQuery) as Record<string, unknown>;
      if (typeof query !== "object" || query === null || Array.isArray(query)) {
        throw new Error("invalid");
      }
    } catch {
      log("صيغة JSON للفلتر غير صالحة.");
      return;
    }
    const res = await fetch("/api/workspace/saved-filters", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module_key: moduleKey.trim(),
        name: filterName.trim(),
        query,
        is_default: false
      })
    });
    const data = await res.json();
    if (!res.ok) {
      log(typeof data.error === "string" ? data.error : "تعذر حفظ الفلتر.");
      return;
    }
    log("تم حفظ الفلتر.");
    setFilterName("");
    await loadAll();
  }

  async function removeFilter(id: string) {
    const res = await fetch(`/api/workspace/saved-filters/${id}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (!res.ok) {
      log("تعذر حذف الفلتر.");
      return;
    }
    log("تم حذف الفلتر.");
    await loadAll();
  }

  if (!apiEnabled) {
    return (
      <section className="luxury-panel rounded-[2rem] p-5 text-sm text-white/60">
        <h3 className="font-bold text-white">إعدادات متقدمة</h3>
        <p className="mt-2">
          فعّل <code className="text-[#d6a84f]">NEXT_PUBLIC_API_BASE_URL</code> لاستخدام الفلاتر المحفوظة،
          أرشيف المستندات، ومعاينة الميزات المستقبلية من الخادم.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="luxury-panel rounded-[2rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#d6a84f]" />
            <h3 className="font-bold text-white">فلاتر محفوظة</h3>
          </div>
          <SecondaryButton onClick={() => void loadAll()}>تحديث</SecondaryButton>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="القسم">
            <input className={inputClass} value={moduleKey} onChange={(e) => setModuleKey(e.target.value)} />
          </Field>
          <Field label="اسم الفلتر">
            <input className={inputClass} value={filterName} onChange={(e) => setFilterName(e.target.value)} />
          </Field>
          <Field label="استعلام (JSON)">
            <input className={inputClass} value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <PrimaryButton onClick={() => void saveFilter()} disabled={loading}>
            حفظ فلتر
          </PrimaryButton>
        </div>
        {filters.length === 0 ? (
          <p className="mt-4 text-sm text-white/45">لا توجد فلاتر محفوظة بعد.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {filters.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span>
                  <span className="font-semibold text-white">{f.name}</span>
                  <span className="text-white/45"> — {f.module_key}</span>
                </span>
                <SecondaryButton onClick={() => void removeFilter(f.id)}>حذف</SecondaryButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-[#d6a84f]" />
          <h3 className="font-bold text-white">أرشيف المستندات</h3>
        </div>
        <p className="mt-1 text-sm text-white/55">فواتير، عقود، وسجلات طباعة مرتبطة بالفرع.</p>
        {documents.length === 0 ? (
          <p className="mt-4 text-sm text-white/45">{loading ? "جاري التحميل…" : "لا مستندات في الأرشيف."}</p>
        ) : (
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
            {documents.map((doc) => (
              <li key={doc.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="font-semibold text-white">{doc.title}</p>
                {doc.subtitle && <p className="text-white/50">{doc.subtitle}</p>}
                {doc.created_at && (
                  <p className="text-xs text-white/35">{formatDateTime(doc.created_at)}</p>
                )}
                {doc.href && (
                  <Link href={doc.href} className="mt-1 inline-block text-xs text-[#d6a84f] hover:underline">
                    فتح
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#d6a84f]" />
          <h3 className="font-bold text-white">ميزات Premium (قيد التجهيز)</h3>
        </div>
        {premium && (
          <>
            <p className="mt-2 text-sm text-amber-200/90">{premium.message}</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {premium.capabilities.map((cap) => (
                <li key={cap.key} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <p className="font-semibold text-white">{cap.title}</p>
                  <p className="text-xs text-white/45">{cap.description}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
