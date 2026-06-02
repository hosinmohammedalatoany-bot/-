"use client";

import { useCallback, useEffect, useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { PrimaryButton, SecondaryButton } from "@/components/ui/primitives";

type AuditRow = {
  id: string;
  action: string;
  actor_name: string;
  actor_email: string;
  target_id: string;
  details: string;
  created_at: string;
};

type DeviceSession = {
  id: string;
  device_label: string;
  ip_address: string | null;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
};

export function SecurityAuditPanel() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutMsg, setLogoutMsg] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = actionFilter ? `?limit=150&action=${encodeURIComponent(actionFilter)}` : "?limit=150";
      const [auditRes, sessRes] = await Promise.all([
        fetch(`/api/auth/audit-logs${qs}`, { credentials: "include" }),
        fetch("/api/auth/sessions", { credentials: "include" })
      ]);
      if (auditRes.status === 403) {
        setLogs([]);
      } else if (auditRes.ok) {
        const auditData = (await auditRes.json()) as { logs?: AuditRow[] };
        setLogs(auditData.logs ?? []);
      } else if (auditRes.status !== 503) {
        const body = (await auditRes.json()) as { error?: string };
        setError(body.error ?? "تعذر تحميل سجل التدقيق.");
      }
      if (sessRes.ok) {
        const sessData = (await sessRes.json()) as { sessions?: DeviceSession[] };
        setSessions(sessData.sessions ?? []);
      }
    } catch {
      setError(ar.error);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function logoutAllDevices() {
    setLogoutMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/logout-all", {
        method: "POST",
        credentials: "include"
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? ar.error);
        return;
      }
      setLogoutMsg(data.message ?? "تم إنهاء الجلسات الأخرى.");
      await load();
    } catch {
      setError(ar.error);
    }
  }

  return (
    <section className="luxury-panel mt-6 rounded-[2rem] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-white">{ar.auditTrail}</h3>
          <p className="mt-1 text-sm text-white/55">
            سجل العمليات الحساسة والأجهزة المتصلة بحسابك.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => void load()} disabled={loading}>
            تحديث
          </SecondaryButton>
          <PrimaryButton onClick={() => void logoutAllDevices()}>
            إنهاء جلسات الأجهزة الأخرى
          </PrimaryButton>
        </div>
      </div>

      {logoutMsg && <p className="mt-3 text-sm text-emerald-300">{logoutMsg}</p>}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-[#f3c96b]">الأجهزة والجلسات</h4>
        {loading && sessions.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">{ar.loading}</p>
        ) : sessions.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">لا توجد جلسات مسجّلة بعد.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-white">
                    {s.device_label || "جهاز غير معروف"}
                  </span>
                  <span
                    className={
                      s.is_active ? "text-emerald-300" : "text-white/45"
                    }
                  >
                    {s.is_active ? "نشطة" : "منتهية"}
                  </span>
                </div>
                <p className="text-xs text-white/45">
                  {s.ip_address ? `IP: ${s.ip_address} · ` : ""}
                  آخر نشاط: {new Date(s.last_seen_at).toLocaleString("ar-IQ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-end gap-3">
          <h4 className="text-sm font-semibold text-[#f3c96b]">آخر العمليات</h4>
          <label className="text-xs text-white/55">
            فلتر الإجراء
            <input
              className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-sm text-white"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="مثال: sale"
            />
          </label>
          <SecondaryButton onClick={() => void load()} disabled={loading}>
            تطبيق الفلتر
          </SecondaryButton>
        </div>
        {loading && logs.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">{ar.loading}</p>
        ) : logs.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">
            لا توجد سجلات أو لا تملك صلاحية العرض.
          </p>
        ) : (
          <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-right text-xs text-white/75">
              <thead className="sticky top-0 bg-[#1a1510] text-white/50">
                <tr>
                  <th className="px-2 py-2">الوقت</th>
                  <th className="px-2 py-2">الإجراء</th>
                  <th className="px-2 py-2">المستخدم</th>
                  <th className="px-2 py-2">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="whitespace-nowrap px-2 py-2">
                      {new Date(row.created_at).toLocaleString("ar-IQ")}
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px]">{row.action}</td>
                    <td className="px-2 py-2">
                      {row.actor_name || row.actor_email || "—"}
                    </td>
                    <td className="px-2 py-2">{row.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
