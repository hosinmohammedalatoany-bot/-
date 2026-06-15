"use client";

import { useCallback, useEffect, useState } from "react";
import { ModulePage } from "@/components/modules/module-page";
import { PrimaryButton, SecondaryButton } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import { useActionLog } from "@/hooks/use-action-log";

type HealthPayload = {
  status?: string;
  api?: string;
  database?: { ok?: boolean; error?: string | null };
  media?: { writable?: boolean; error?: string | null };
  backup?: {
    last_success_at?: string | null;
    last_success_file?: string | null;
    last_failed_at?: string | null;
    stale?: boolean;
    auto_backup_hours?: number;
  };
  errors_last_24h?: number;
  alerts?: Array<{ level: string; message: string }>;
};

type ErrorLogRow = {
  id: string;
  level: string;
  source: string;
  message: string;
  request_path: string;
  user_email: string;
  created_at: string;
};

type SyncLogRow = {
  id: string;
  device_id: string;
  status: string;
  accepted_count: number;
  duplicate_count: number;
  failed_count: number;
  remaining_count: number;
  message: string;
  user_email: string;
  created_at: string;
};

function statusColor(status?: string) {
  if (status === "healthy") return "text-emerald-300";
  if (status === "critical") return "text-red-300";
  return "text-amber-300";
}

export function SystemHealthModule() {
  const { log, items } = useActionLog();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLogRow[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const [hRes, eRes, sRes] = await Promise.all([
        fetch("/api/ops/health", { credentials: "include" }),
        fetch("/api/ops/error-logs?limit=40", { credentials: "include" }),
        fetch("/api/ops/sync-logs?limit=40", { credentials: "include" })
      ]);
      const hJson = (await hRes.json()) as HealthPayload & { error?: string };
      if (!hRes.ok) {
        setApiError(hJson.error ?? "تعذر تحميل صحة النظام.");
        setHealth(null);
      } else {
        setHealth(hJson);
      }
      if (eRes.ok) {
        const eJson = (await eRes.json()) as { logs?: ErrorLogRow[] };
        setErrorLogs(eJson.logs ?? []);
      }
      if (sRes.ok) {
        const sJson = (await sRes.json()) as { logs?: SyncLogRow[] };
        setSyncLogs(sJson.logs ?? []);
      }
    } catch {
      setApiError("تعذر الاتصال بخدمة المراقبة.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <ModulePage moduleKey="system-health">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">الحالة العامة</p>
          <p className={`mt-2 text-xl font-black ${statusColor(health?.status)}`}>
            {loading ? "…" : (health?.status ?? "—")}
          </p>
        </article>
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">قاعدة البيانات</p>
          <p className="mt-2 text-xl font-black">
            {loading ? "…" : health?.database?.ok ? "متصلة" : "غير متصلة"}
          </p>
        </article>
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">أخطاء (24 ساعة)</p>
          <p className="mt-2 text-xl font-black text-[#f3c96b]">
            {loading ? "…" : (health?.errors_last_24h ?? 0)}
          </p>
        </article>
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">API</p>
          <p className="mt-2 text-lg font-bold">{loading ? "…" : (health?.api ?? "—")}</p>
        </article>
      </section>

      {apiError ? (
        <section className="luxury-panel rounded-[2rem] border border-red-500/30 p-5 text-sm text-red-200">
          {apiError}
          <p className="mt-2 text-white/50">
            تأكد من تشغيل خادم Django وضبط NEXT_PUBLIC_API_BASE_URL.
          </p>
        </section>
      ) : null}

      <section className="luxury-panel rounded-[2rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-white">تنبيهات النظام</h3>
          <SecondaryButton onClick={() => void load()}>
            تحديث
          </SecondaryButton>
        </div>
        {!health?.alerts?.length ? (
          <p className="mt-2 text-sm text-white/55">لا توجد تنبيهات نشطة.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {health.alerts.map((a, i) => (
              <li
                key={`${a.level}-${i}`}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  a.level === "critical"
                    ? "border-red-500/40 bg-red-500/10 text-red-100"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                }`}
              >
                {a.message}
              </li>
            ))}
          </ul>
        )}
        {health?.backup?.last_success_at ? (
          <p className="mt-4 text-xs text-white/45">
            آخر نسخة ناجحة: {formatDateTime(health.backup.last_success_at)}
            {health.backup.last_success_file ? ` — ${health.backup.last_success_file}` : ""}
          </p>
        ) : null}
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">سجل أخطاء الخادم</h3>
        {errorLogs.length === 0 ? (
          <p className="mt-2 text-sm text-white/55">لا توجد أخطاء مسجّلة مؤخراً.</p>
        ) : (
          <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-sm">
            {errorLogs.map((row) => (
              <li key={row.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-[#d6a84f]">{row.source}</span>
                  <span className="text-white/60">{row.level}</span>
                </div>
                <p className="text-white/80">{row.message}</p>
                <p className="text-xs text-white/45">
                  {row.request_path || "—"} · {formatDateTime(row.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">سجل مزامنة الأجهزة (خادم)</h3>
        {syncLogs.length === 0 ? (
          <p className="mt-2 text-sm text-white/55">لا توجد مزامنات مسجّلة على الخادم.</p>
        ) : (
          <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-sm">
            {syncLogs.map((row) => (
              <li key={row.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>{row.device_id || "جهاز"}</span>
                  <span
                    className={
                      row.status === "success"
                        ? "text-emerald-300"
                        : row.status === "partial"
                          ? "text-amber-300"
                          : "text-red-300"
                    }
                  >
                    {row.status}
                  </span>
                </div>
                <p className="text-xs text-white/45">
                  مقبول {row.accepted_count} · مكرر {row.duplicate_count} · فشل{" "}
                  {row.failed_count} — {formatDateTime(row.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">سجل العمليات</h3>
        <ul className="mt-2 space-y-1 text-sm text-white/60">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <PrimaryButton
          className="mt-4"
          onClick={() => {
            log("تم تحديث لوحة صحة النظام.");
            void load();
          }}
        >
          إعادة الفحص
        </PrimaryButton>
      </section>
    </ModulePage>
  );
}
