"use client";

import { useCallback, useEffect, useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { ModulePage } from "@/components/modules/module-page";
import { PrimaryButton, SecondaryButton } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { downloadBlob } from "@/lib/print";
import { formatDateTime } from "@/lib/utils";
import { useActionLog } from "@/hooks/use-action-log";

type ServerBackup = {
  id: string;
  kind: string;
  status: string;
  file_name: string;
  byte_size: number;
  entity_counts: Record<string, number>;
  error_message: string;
  created_at: string;
};

function readIsAdmin() {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("br_user");
    if (!raw) return false;
    const u = JSON.parse(raw) as { role?: string };
    return u.role === "super-admin";
  } catch {
    return false;
  }
}

export function BackupSyncModule() {
  const syncStatus = useShowroomStore((s) => s.syncStatus);
  const pendingOperations = useShowroomStore((s) => s.pendingOperations);
  const lastSyncAt = useShowroomStore((s) => s.lastSyncAt);
  const syncLogs = useShowroomStore((s) => s.syncLogs);
  const synchronize = useShowroomStore((s) => s.synchronize);
  const resetLocalShowroomData = useShowroomStore((s) => s.resetLocalShowroomData);
  const vehicles = useShowroomStore((s) => s.vehicles);
  const customers = useShowroomStore((s) => s.customers);
  const leads = useShowroomStore((s) => s.leads);
  const invoices = useShowroomStore((s) => s.invoices);
  const { log, items } = useActionLog();
  const [syncing, setSyncing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [serverBackups, setServerBackups] = useState<ServerBackup[]>([]);
  const [serverBusy, setServerBusy] = useState(false);

  const loadServerBackups = useCallback(async () => {
    const res = await fetch("/api/ops/backups?limit=20", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { backups?: ServerBackup[] };
    setServerBackups(data.backups ?? []);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setIsAdmin(readIsAdmin());
      if (readIsAdmin()) {
        void loadServerBackups();
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadServerBackups]);

  async function createServerBackup() {
    setServerBusy(true);
    const res = await fetch("/api/ops/backups", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "manual" })
    });
    const data = (await res.json()) as ServerBackup & { error?: string; detail?: string };
    if (!res.ok) {
      log(data.error ?? data.detail ?? "فشل إنشاء النسخة على الخادم.");
    } else {
      log(`نسخة خادم: ${data.file_name || data.id} (${data.status})`);
      await loadServerBackups();
    }
    setServerBusy(false);
  }

  async function downloadServerBackup(id: string, fileName: string) {
    const res = await fetch(`/api/ops/backups/${id}/download`, { credentials: "include" });
    if (!res.ok) {
      log("تعذر تنزيل النسخة من الخادم.");
      return;
    }
    const blob = await res.blob();
    const text = await blob.text();
    downloadBlob(fileName || `backup-${id}.json`, text, "application/json");
    log("تم تنزيل نسخة الخادم.");
  }

  async function restoreServerBackup(id: string) {
    const ok = window.confirm(
      "استعادة النسخة ستستبدل بيانات المعرض على الخادم. هل تريد المتابعة؟"
    );
    if (!ok) return;
    setServerBusy(true);
    const res = await fetch(`/api/ops/backups/${id}/restore`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true })
    });
    const data = (await res.json()) as { error?: string; detail?: string; ok?: boolean };
    if (!res.ok) {
      log(data.error ?? data.detail ?? "فشلت الاستعادة.");
    } else {
      log("تمت استعادة النسخة الاحتياطية على الخادم.");
    }
    setServerBusy(false);
  }

  async function runSync() {
    setSyncing(true);
    await synchronize();
    log(ar.success);
    setSyncing(false);
  }

  async function resetLocalData() {
    const ok = window.confirm(
      "سيتم حذف جميع السيارات والعملاء والفواتير المحفوظة على هذا الجهاز. لا يمكن التراجع. هل تريد المتابعة؟"
    );
    if (!ok) {
      return;
    }
    await resetLocalShowroomData();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("br_user");
    }
    log("تم تصفير البيانات المحلية على هذا الجهاز.");
    window.location.href = "/login";
  }

  function exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      vehicles,
      customers,
      leads,
      invoices,
      pendingOperations
    };
    downloadBlob(
      `baraa-raed-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8"
    );
    log("تم تنزيل نسخة احتياطية JSON.");
  }

  const statusLabel =
    syncStatus === "online" ? ar.online : syncStatus === "syncing" ? ar.syncing : ar.offline;

  return (
    <ModulePage moduleKey="backup-sync">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">{ar.syncStatus}</p>
          <p className="mt-2 text-xl font-black text-[#f3c96b]">{statusLabel}</p>
        </article>
        <article className="luxury-panel rounded-2xl p-4">
          <p className="text-sm text-white/55">{ar.pendingOps}</p>
          <p className="mt-2 text-xl font-black">{pendingOperations.length}</p>
        </article>
        <article className="luxury-panel rounded-2xl p-4 sm:col-span-2">
          <p className="text-sm text-white/55">{ar.lastSync}</p>
          <p className="mt-2 text-lg font-bold">{lastSyncAt ? formatDateTime(lastSyncAt) : "—"}</p>
        </article>
      </section>

      {isAdmin ? (
        <section className="luxury-panel rounded-[2rem] p-5">
          <h3 className="font-bold text-white">نسخ احتياطي على الخادم (بيانات المعرض)</h3>
          <p className="mt-1 text-sm text-white/55">
            نسخة JSON لبيانات السيارات والعملاء والمبيعات — بدون كلمات مرور المستخدمين.
          </p>
          <div className="no-print mt-4 flex flex-wrap gap-2">
            <PrimaryButton disabled={serverBusy} onClick={() => void createServerBackup()}>
              {serverBusy ? "جاري التنفيذ…" : "إنشاء نسخة على الخادم"}
            </PrimaryButton>
            <SecondaryButton onClick={() => void loadServerBackups()}>
              تحديث القائمة
            </SecondaryButton>
          </div>
          {serverBackups.length === 0 ? (
            <p className="mt-3 text-sm text-white/55">لا توجد نسخ على الخادم بعد.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {serverBackups.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div>
                    <span className="text-[#d6a84f]">{b.file_name || b.id}</span>
                    <span className="block text-xs text-white/45">
                      {b.kind} · {b.status} · {formatDateTime(b.created_at)}
                      {b.byte_size ? ` · ${Math.round(b.byte_size / 1024)} KB` : ""}
                    </span>
                    {b.error_message ? (
                      <span className="block text-xs text-red-300">{b.error_message}</span>
                    ) : null}
                  </div>
                  {b.status === "success" ? (
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton
                        onClick={() => void downloadServerBackup(b.id, b.file_name)}
                      >
                        تنزيل
                      </SecondaryButton>
                      <SecondaryButton onClick={() => void restoreServerBackup(b.id)}>
                        استعادة
                      </SecondaryButton>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">المزامنة والنسخ الاحتياطي</h3>
        <p className="mt-1 text-sm text-white/55">
          العمليات في وضع عدم الاتصال تُحفظ في IndexedDB وتُرفع عند المزامنة.
        </p>
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <PrimaryButton disabled={syncing || syncStatus === "offline"} onClick={() => void runSync()}>
            {syncing ? ar.syncing : ar.syncNow}
          </PrimaryButton>
          <SecondaryButton onClick={exportBackup}>
            تنزيل نسخة احتياطية
          </SecondaryButton>
          <SecondaryButton onClick={() => void resetLocalData()}>
            تصفير البيانات المحلية (هذا الجهاز)
          </SecondaryButton>
        </div>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">العمليات المعلقة</h3>
        {pendingOperations.length === 0 ? (
          <p className="mt-2 text-sm text-white/55">لا توجد عمليات معلقة.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {pendingOperations.map((op) => (
              <li key={op.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-[#d6a84f]">{op.operation}</span> — {op.entityLabel}
                <span className="block text-xs text-white/45">{formatDateTime(op.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">سجل المزامنة</h3>
        {syncLogs.length === 0 ? (
          <p className="mt-2 text-sm text-white/55">لا توجد محاولات مزامنة مسجّلة بعد.</p>
        ) : (
          <ul className="mt-3 max-h-48 space-y-2 overflow-auto text-sm">
            {syncLogs.slice(0, 12).map((row) => (
              <li key={row.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-white/80">{row.message}</span>
                  <span
                    className={
                      row.status === "success"
                        ? "text-emerald-300"
                        : row.status === "partial"
                          ? "text-amber-300"
                          : "text-red-300"
                    }
                  >
                    {row.status === "success"
                      ? "نجاح"
                      : row.status === "partial"
                        ? "جزئي"
                        : "فشل"}
                  </span>
                </div>
                <p className="text-xs text-white/45">
                  مقبول {row.accepted} · مكرر {row.duplicates} · متبقي {row.remaining} —{" "}
                  {formatDateTime(row.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-white/45">
          PWA: من المتصفح على iPhone استخدم «إضافة إلى الشاشة الرئيسية». على Android/Chrome يظهر
          زر التثبيت عند توفره.
        </p>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">سجل العمليات</h3>
        <ul className="mt-2 space-y-1 text-sm text-white/60">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>
    </ModulePage>
  );
}
