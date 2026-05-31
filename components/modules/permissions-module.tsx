"use client";

import { useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { ModulePage } from "@/components/modules/module-page";
import { UserApprovalsPanel } from "@/components/modules/user-approvals-panel";
import { PrimaryButton } from "@/components/ui/primitives";
import { useActionLog } from "@/hooks/use-action-log";

const STORAGE_KEY = "br_permissions";

type PermissionFlags = {
  printInvoices: boolean;
  printContracts: boolean;
  printReports: boolean;
  exportPdf: boolean;
  exportExcel: boolean;
  editAfterPrint: boolean;
  manageUsers: boolean;
  viewAllBranches: boolean;
};

const defaults: PermissionFlags = {
  printInvoices: true,
  printContracts: true,
  printReports: true,
  exportPdf: true,
  exportExcel: true,
  editAfterPrint: false,
  manageUsers: false,
  viewAllBranches: true
};

const labels: Record<keyof PermissionFlags, string> = {
  printInvoices: ar.permissions.printInvoices,
  printContracts: ar.permissions.printContracts,
  printReports: ar.permissions.printReports,
  exportPdf: ar.permissions.exportPdf,
  exportExcel: ar.permissions.exportExcel,
  editAfterPrint: "تعديل الفواتير بعد الطباعة (مدير فقط)",
  manageUsers: "إدارة المستخدمين والصلاحيات",
  viewAllBranches: "عرض كل الفروع"
};

function loadStoredPermissions(): { flags: PermissionFlags; role: string } {
  if (typeof window === "undefined") {
    return { flags: defaults, role: "مدير عام" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { flags?: Partial<PermissionFlags>; role?: string };
      return {
        flags: { ...defaults, ...parsed.flags },
        role: parsed.role ?? "مدير عام"
      };
    }
  } catch {
    /* ignore */
  }
  return { flags: defaults, role: "مدير عام" };
}

export function PermissionsModule() {
  const { log, items } = useActionLog();
  const [stored] = useState(loadStoredPermissions);
  const [flags, setFlags] = useState<PermissionFlags>(stored.flags);
  const [role, setRole] = useState(stored.role);
  const [loading, setLoading] = useState(false);

  function toggle(key: keyof PermissionFlags) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    setLoading(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, flags }));
    log("تم حفظ إعدادات الصلاحيات محلياً.");
    setLoading(false);
  }

  return (
    <ModulePage moduleKey="permissions">
      <UserApprovalsPanel />

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">الأدوار والصلاحيات</h3>
        <p className="mt-1 text-sm text-white/55">
          صلاحيات الطباعة والتصدير والفروع — تُطبَّق على الجلسة الحالية وتُحفظ محلياً حتى ربط الخادم.
        </p>
        <label className="mt-4 grid gap-1.5 text-sm text-white/70">
          الدور النشط
          <select
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="مدير عام">مدير عام</option>
            <option value="مدير فرع">مدير فرع</option>
            <option value="مبيعات">موظف مبيعات</option>
            <option value="محاسب">محاسب</option>
            <option value="مخزون">موظف مخزون</option>
          </select>
        </label>
        <ul className="mt-4 space-y-2">
          {(Object.keys(labels) as Array<keyof PermissionFlags>).map((key) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <span>{labels[key]}</span>
                <input type="checkbox" checked={flags[key]} onChange={() => toggle(key)} />
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <PrimaryButton type="button" disabled={loading} onClick={save}>
            {loading ? ar.loading : ar.save}
          </PrimaryButton>
        </div>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">حسابات الفروع (مثال)</h3>
        <ul className="mt-2 space-y-2 text-sm text-white/65">
          <li>manager.baghdad@company.com — بغداد</li>
          <li>manager.basra@company.com — البصرة</li>
          <li>manager.erbil@company.com — أربيل</li>
        </ul>
        <p className="mt-3 text-xs text-white/45">أنشئ المستخدمين من إعداد المدير الأول أو عبر واجهة المستخدمين عند تفعيل الخادم.</p>
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
