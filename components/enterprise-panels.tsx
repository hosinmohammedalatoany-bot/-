"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { auditActionLabel, type AuditAction } from "@/lib/services/audit";
import { LEAD_PIPELINE, PRINT_TEMPLATES, WHATSAPP_TEMPLATES } from "@/lib/enterprise";
import { useShowroomStore } from "@/lib/showroom-store";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDateTime } from "@/lib/utils";

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  if (rows.length === 0) {
    return <EmptyState title="لا توجد سجلات" description="ستظهر البيانات هنا عند تنفيذ العمليات." />;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-full text-right text-sm">
        <thead className="bg-white/5 text-white/60">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-white/5 text-white/85">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EnterpriseModulePanel({ moduleKey }: { moduleKey: string }) {
  const store = useShowroomStore();

  if (moduleKey === "notifications") {
    const items = store.notifications;
    return (
      <div className="grid gap-4">
        <div className="flex justify-between">
          <h3 className="text-lg font-semibold text-white">مركز الإشعارات</h3>
          <button
            type="button"
            onClick={() => store.refreshNotifications()}
            className="text-sm text-[#d6a84f]"
          >
            تحديث
          </button>
        </div>
        {items.length === 0 ? (
          <EmptyState title="لا إشعارات" description="كل شيء على ما يرام حالياً." />
        ) : (
          <ul className="grid gap-2">
            {items.map((n) => (
              <li
                key={n.id}
                className={`rounded-xl border px-4 py-3 ${n.read ? "border-white/10 opacity-60" : "border-[#d6a84f]/30"}`}
              >
                <div className="flex justify-between gap-2">
                  <strong className="text-white">{n.title}</strong>
                  {!n.read && (
                    <button type="button" className="text-xs text-[#d6a84f]" onClick={() => store.markNotificationRead(n.id)}>
                      تعليم كمقروء
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm text-white/65">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (moduleKey === "permissions") {
    return (
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold text-white">إعدادات الصلاحيات</h3>
        <p className="text-sm text-white/60">تفعيل أو تعطيل الصلاحيات لكل دور ثم حفظ التطبيق على المستخدمين.</p>
        <Table
          headers={["الدور", "الصلاحيات"]}
          rows={[
            ["مدير النظام", "كل الوحدات + الموافقات + النسخ"],
            ["مدير فرع", "مبيعات + مخزون + تقارير الفرع"],
            ["مبيعات", "سيارات + عملاء + Leads"],
            ["محاسبة", "فواتير + أقساط + محاسبة"]
          ]}
        />
      </div>
    );
  }

  if (moduleKey === "printing") {
    return (
      <div className="grid gap-6">
        <h3 className="text-lg font-semibold text-white">مركز الطباعة</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRINT_TEMPLATES.map((t) => (
            <div key={t.key} className="luxury-panel rounded-2xl p-4">
              <p className="font-semibold text-white">{t.titleAr}</p>
              <p className="text-xs text-white/50">{t.key}</p>
            </div>
          ))}
        </div>
        <Table
          headers={["المستند", "القالب", "الوقت", "رمز التحقق"]}
          rows={store.printJobs.slice(0, 12).map((job) => [
            job.documentType,
            job.template,
            formatDateTime(job.createdAt),
            <Link key={job.id} href={`/verify/${job.verificationCode}`} className="text-[#d6a84f] underline">
              {job.verificationCode}
            </Link>
          ])}
        />
      </div>
    );
  }

  if (moduleKey === "backup-sync") {
    return (
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold text-white">النسخ الاحتياطي والمزامنة</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => store.runBackup(true)}
            className="rounded-xl bg-[#d6a84f] px-4 py-2 text-sm font-bold text-black"
          >
            نسخ احتياطي يدوي
          </button>
          <button type="button" onClick={() => void store.synchronize()} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white">
            مزامنة الآن
          </button>
        </div>
        <Table
          headers={["النوع", "الحجم", "الحالة", "الوقت"]}
          rows={store.backups.map((b) => [
            b.kind === "manual" ? "يدوي" : "يومي",
            `${Math.round(b.sizeBytes / 1024)} KB`,
            b.status,
            formatDateTime(b.createdAt)
          ])}
        />
        <p className="text-xs text-white/50">العمليات المعلقة: {store.pendingOperations.length}</p>
      </div>
    );
  }

  if (moduleKey === "system-health") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "API", value: "متصل" },
          { label: "قاعدة البيانات", value: "IndexedDB محلي" },
          { label: "آخر مزامنة", value: store.lastSyncAt ? formatDateTime(store.lastSyncAt) : "—" },
          { label: "آخر نسخة", value: store.backups[0] ? formatDateTime(store.backups[0].createdAt) : "—" },
          { label: "PWA", value: "مفعّل" },
          { label: "Service Worker", value: typeof window !== "undefined" && "serviceWorker" in navigator ? "مدعوم" : "غير متاح" },
          { label: "الأجهزة", value: String(store.devices.length) },
          { label: "أخطاء حديثة", value: String(store.errorLogs.length) }
        ].map((item) => (
          <div key={item.label} className="luxury-panel rounded-2xl p-4">
            <p className="text-xs text-white/50">{item.label}</p>
            <p className="mt-1 font-semibold text-white">{item.value}</p>
          </div>
        ))}
        <div className="col-span-full">
          <h4 className="mb-2 font-medium text-white">سجل الأخطاء</h4>
          <Table
            headers={["الرسالة", "الصفحة", "المستخدم", "الوقت"]}
            rows={store.errorLogs.slice(0, 8).map((e) => [e.message, e.page, e.userName, formatDateTime(e.createdAt)])}
          />
        </div>
      </div>
    );
  }

  if (moduleKey === "settings") {
    const c = store.company;
    return (
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold text-white">إعدادات الشركة</h3>
        <dl className="grid gap-2 rounded-2xl border border-white/10 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-white/50">الاسم</dt>
            <dd className="text-white">{c.companyName}</dd>
          </div>
          <div>
            <dt className="text-white/50">الهاتف</dt>
            <dd className="text-white">{c.phone}</dd>
          </div>
          <div>
            <dt className="text-white/50">البريد</dt>
            <dd className="text-white">{c.email}</dd>
          </div>
          <div>
            <dt className="text-white/50">العملة</dt>
            <dd className="text-white">{c.currency}</dd>
          </div>
          <div className="col-span-full">
            <dt className="text-white/50">العنوان</dt>
            <dd className="text-white">{c.address}</dd>
          </div>
        </dl>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={store.demoMode} onChange={(e) => store.setDemoMode(e.target.checked)} />
          وضع التدريب (Demo) — لا يؤثر على البيانات الحقيقية
        </label>
        <Link href="/public" className="text-sm text-[#d6a84f] underline">
          معاينة الموقع العام للزبائن
        </Link>
      </div>
    );
  }

  if (moduleKey === "whatsapp") {
    return (
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold text-white">قوالب واتساب</h3>
        <ul className="grid gap-2">
          {WHATSAPP_TEMPLATES.map((t) => (
            <li key={t.key} className="rounded-xl border border-white/10 p-4">
              <p className="font-medium text-white">{t.titleAr}</p>
              <p className="mt-1 text-xs text-white/50">{t.key}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (moduleKey === "leads") {
    return (
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold text-white">Pipeline — العملاء المحتملون</h3>
        <div className="flex flex-wrap gap-2">
          {LEAD_PIPELINE.map((stage) => (
            <span key={stage.key} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80">
              {stage.labelAr}:{" "}
              {store.leads.filter((l) => l.status === stage.key || (stage.key === "sold" && l.status === "converted")).length}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (moduleKey === "reports") {
    const sales = store.invoices.reduce((s, i) => s + i.total - i.discount, 0);
    const profit = store.vehicles
      .filter((v) => v.status === "sold")
      .reduce((s, v) => s + v.salePrice - v.purchasePrice - v.maintenanceCost, 0);
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="luxury-panel rounded-2xl p-4">
          <p className="text-xs text-white/50">إجمالي المبيعات</p>
          <p className="text-xl font-bold text-white">{formatCurrency(sales)}</p>
        </div>
        <div className="luxury-panel rounded-2xl p-4">
          <p className="text-xs text-white/50">ربح تقديري (مباع)</p>
          <p className="text-xl font-bold text-emerald-300">{formatCurrency(profit)}</p>
        </div>
        <p className="col-span-full text-sm text-white/60">
          تقارير إضافية: المخزون، الراكدة، الموظفين، الفروع، Audit — متاحة عبر التصدير.
        </p>
      </div>
    );
  }

  // Audit + approvals embedded in dashboard module area via reports section — show audit here for employees module too
  if (moduleKey === "employees") {
    return (
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold text-white">سجل التدقيق (Audit)</h3>
        <Table
          headers={["العملية", "الكيان", "المستخدم", "الوقت"]}
          rows={store.auditLogs.slice(0, 20).map((log) => [
            auditActionLabel(log.action as AuditAction),
            log.entityLabel,
            log.userName,
            formatDateTime(log.createdAt)
          ])}
        />
        <h3 className="text-lg font-semibold text-white">طلبات الموافقة</h3>
        <Table
          headers={["العنوان", "الحالة", "طلب بواسطة", "إجراء"]}
          rows={store.approvals.map((a) => [
            a.title,
            a.status,
            a.requestedBy,
            a.status === "pending" ? (
              <span className="flex gap-2">
                <button type="button" className="text-emerald-400" onClick={() => store.resolveApproval(a.id, true)}>
                  موافقة
                </button>
                <button type="button" className="text-red-400" onClick={() => store.resolveApproval(a.id, false)}>
                  رفض
                </button>
              </span>
            ) : (
              "—"
            )
          ])}
        />
      </div>
    );
  }

  return null;
}
