"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Bell, Clock } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { EmptyState, PrimaryButton, inputClass } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";

const apiEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

type NotificationItem = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  body: string;
  href: string;
  created_at: string;
  read?: boolean;
};

function severityClass(severity: string) {
  if (severity === "high") return "border-red-400/40 bg-red-400/10 text-red-100";
  if (severity === "medium") return "border-amber-400/40 bg-amber-400/10 text-amber-100";
  return "border-white/15 bg-white/5 text-white/70";
}

export function NotificationsModule() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(apiEnabled);
  const [branchName, setBranchName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiEnabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (branchName.trim()) params.set("branch_name", branchName.trim());
      const res = await fetch(`/api/workspace/notifications?${params.toString()}`, {
        credentials: "include"
      });
      const data = (await res.json()) as {
        items?: NotificationItem[];
        unread_count?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "تعذر تحميل الإشعارات");
      setItems(data.items ?? []);
      setUnread(data.unread_count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التحميل");
    } finally {
      setLoading(false);
    }
  }, [branchName]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <ModulePage moduleKey="notifications">
      <section className="luxury-panel rounded-[2rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#d6a84f]" />
            <div>
              <h3 className="font-bold text-white">مركز الإشعارات</h3>
              <p className="text-sm text-white/55">
                أقساط، حجوزات، متابعات، ونسخ احتياطي — {unread} غير مقروء
              </p>
            </div>
          </div>
          <PrimaryButton type="button" onClick={() => void load()}>
            تحديث
          </PrimaryButton>
        </div>
        {apiEnabled && (
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              className={inputClass + " max-w-xs"}
              placeholder="تصفية حسب الفرع (اختياري)"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
            />
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        {!apiEnabled && (
          <p className="mt-4 text-sm text-amber-200">
            ربط API مطلوب لعرض الإشعارات الحية من الخادم.
          </p>
        )}
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        {loading && <p className="text-sm text-white/50">جاري التحميل…</p>}
        {!loading && items.length === 0 && (
          <EmptyState title="لا إشعارات حالياً" hint="ستظهر التنبيهات عند استحقاق أقساط أو انتهاء حجوزات." />
        )}
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-2xl border p-4 ${severityClass(item.severity)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-bold">
                    {item.severity === "high" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm opacity-90">{item.body}</p>
                  <p className="mt-2 text-xs opacity-60">
                    {formatDateTime(item.created_at)}
                  </p>
                </div>
                {item.href && (
                  <Link
                    href={item.href}
                    className="shrink-0 rounded-xl border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
                  >
                    فتح
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </ModulePage>
  );
}
