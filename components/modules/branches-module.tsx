"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ar, moduleTitlesAr } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import type { BranchRecord } from "@/lib/organization-map";
import { ModulePage } from "@/components/modules/module-page";
import { EmptyState, Field, PrimaryButton, SecondaryButton, inputClass } from "@/components/ui/primitives";

type BranchForm = {
  name: string;
  code: string;
  address: string;
  phone: string;
  manager_name: string;
};

const emptyBranch: BranchForm = {
  name: "",
  code: "",
  address: "",
  phone: "",
  manager_name: ""
};

export function BranchesModule() {
  const { log, items } = useActionLog();
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const form = useForm<BranchForm>({ defaultValues: emptyBranch });

  const loadBranches = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/organization/branches", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        log(typeof data.error === "string" ? data.error : ar.error);
        return;
      }
      setBranches(data.branches ?? []);
    } catch {
      log("تعذر تحميل الفروع.");
    } finally {
      setFetching(false);
    }
  }, [log]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBranches(), 0);
    return () => window.clearTimeout(timer);
  }, [loadBranches]);

  async function toggleActive(branch: BranchRecord) {
    setLoading(true);
    try {
      const res = await fetch(`/api/organization/branches/${branch.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !branch.is_active })
      });
      const data = await res.json();
      if (!res.ok) {
        log(typeof data.error === "string" ? data.error : ar.error);
        return;
      }
      log(branch.is_active ? `تم تعطيل فرع ${branch.name}.` : `تم تفعيل فرع ${branch.name}.`);
      await loadBranches();
    } finally {
      setLoading(false);
    }
  }

  async function removeBranch(branch: BranchRecord) {
    if (!confirm(`هل تريد حذف أو أرشفة فرع «${branch.name}»؟`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/organization/branches/${branch.id}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 204) {
        log(typeof data.error === "string" ? data.error : ar.error);
        return;
      }
      log(
        typeof data.message === "string"
          ? data.message
          : `تم حذف فرع ${branch.name}.`
      );
      await loadBranches();
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModulePage moduleKey="branches">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h2 className="text-xl font-black text-white">{moduleTitlesAr.branches}</h2>
        <p className="mt-1 text-sm text-white/55">
          إدارة فروع المعرض، ربط الموظفين، وعناوين الطباعة لكل فرع.
        </p>

        <form
          className="mt-5 grid gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (data) => {
            if (!data.name.trim()) {
              log("اسم الفرع مطلوب.");
              return;
            }
            setLoading(true);
            try {
              const res = await fetch("/api/organization/branches", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
              });
              const payload = await res.json();
              if (!res.ok) {
                log(typeof payload.error === "string" ? payload.error : ar.error);
                return;
              }
              log(`تم إنشاء فرع ${payload.branch?.name ?? data.name}.`);
              form.reset(emptyBranch);
              await loadBranches();
            } finally {
              setLoading(false);
            }
          })}
        >
          <Field label="اسم الفرع *">
            <input className={inputClass} {...form.register("name")} />
          </Field>
          <Field label="رمز الفرع (اختياري)">
            <input className={inputClass} {...form.register("code")} placeholder="baghdad" />
          </Field>
          <Field label="الهاتف">
            <input className={inputClass} {...form.register("phone")} />
          </Field>
          <Field label="مدير الفرع">
            <input className={inputClass} {...form.register("manager_name")} />
          </Field>
          <div className="md:col-span-2">
            <Field label="العنوان">
              <textarea className={inputClass} rows={2} {...form.register("address")} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? ar.loading : "إضافة فرع"}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-white">قائمة الفروع</h3>
          <SecondaryButton onClick={() => void loadBranches()} disabled={fetching}>
            تحديث
          </SecondaryButton>
        </div>
        {fetching ? (
          <p className="mt-4 text-sm text-white/50">جاري التحميل…</p>
        ) : branches.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="لا توجد فروع" hint="أضف أول فرع من النموذج أعلاه." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm text-white/80">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="py-2 text-start">الفرع</th>
                  <th className="py-2 text-start">الرمز</th>
                  <th className="py-2 text-start">الهاتف</th>
                  <th className="py-2 text-start">المستخدمون</th>
                  <th className="py-2 text-start">الحالة</th>
                  <th className="py-2 text-start">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id} className="border-b border-white/5">
                    <td className="py-3 font-medium text-white">{b.name}</td>
                    <td className="py-3">{b.code}</td>
                    <td className="py-3">{b.phone || "—"}</td>
                    <td className="py-3">{b.user_count ?? 0}</td>
                    <td className="py-3">
                      <span
                        className={
                          b.is_active ? "text-emerald-400" : "text-amber-400"
                        }
                      >
                        {b.is_active ? "فعال" : "معطل"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <SecondaryButton
                          disabled={loading}
                          onClick={() => void toggleActive(b)}
                        >
                          {b.is_active ? "تعطيل" : "تفعيل"}
                        </SecondaryButton>
                        <SecondaryButton
                          disabled={loading}
                          onClick={() => void removeBranch(b)}
                        >
                          حذف
                        </SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
