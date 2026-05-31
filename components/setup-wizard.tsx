"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { DEFAULT_COMPANY } from "@/lib/enterprise";
import { useShowroomStore } from "@/lib/showroom-store";
import { cn } from "@/lib/utils";

const steps = [
  "بيانات المعرض",
  "التواصل والسجل",
  "العملة واللغة",
  "الفرع الرئيسي",
  "حساب المدير",
  "الطباعة",
  "النسخ الاحتياطي",
  "المراجعة"
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#d6a84f]/70";

export function SetupWizard() {
  const completeSetup = useShowroomStore((s) => s.completeSetup);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    companyName: DEFAULT_COMPANY.companyName,
    logoUrl: DEFAULT_COMPANY.logoUrl,
    phone: DEFAULT_COMPANY.phone,
    address: DEFAULT_COMPANY.address,
    email: DEFAULT_COMPANY.email,
    commercialRegistration: DEFAULT_COMPANY.commercialRegistration,
    taxNumber: DEFAULT_COMPANY.taxNumber,
    currency: DEFAULT_COMPANY.currency,
    language: DEFAULT_COMPANY.language as "ar" | "en",
    mainBranch: DEFAULT_COMPANY.mainBranch,
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    printPaper: "a4" as "a4" | "thermal-80",
    backupEnabled: true
  });

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else {
      completeSetup({
        companyName: form.companyName,
        phone: form.phone,
        address: form.address,
        email: form.email,
        commercialRegistration: form.commercialRegistration,
        taxNumber: form.taxNumber,
        currency: form.currency,
        language: form.language,
        mainBranch: form.mainBranch,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        printPaper: form.printPaper,
        backupEnabled: form.backupEnabled
      });
    }
  }

  return (
    <div className="rtl-support mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-4">
        <BrandLogo />
        <div>
          <h1 className="gold-text text-2xl font-bold">مركز الإعداد الأول</h1>
          <p className="text-sm text-white/60">Baraa Raed — إعداد معرض السيارات</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.map((label, index) => (
          <span
            key={label}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              index === step
                ? "border-[#d6a84f] bg-[#d6a84f]/20 text-[#f3c96b]"
                : index < step
                  ? "border-emerald-500/40 text-emerald-200"
                  : "border-white/10 text-white/40"
            )}
          >
            {index + 1}. {label}
          </span>
        ))}
      </div>

      <section className="luxury-panel rounded-3xl p-6">
        {step === 0 && (
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm text-white/70">
              اسم المعرض
              <input className={inputClass} value={form.companyName} onChange={(e) => patch("companyName", e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm text-white/70">
              رابط الشعار (اختياري)
              <input className={inputClass} value={form.logoUrl} onChange={(e) => patch("logoUrl", e.target.value)} />
            </label>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-white/70">
              الهاتف
              <input className={inputClass} value={form.phone} onChange={(e) => patch("phone", e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm text-white/70">
              البريد
              <input className={inputClass} type="email" value={form.email} onChange={(e) => patch("email", e.target.value)} />
            </label>
            <label className="col-span-full grid gap-1 text-sm text-white/70">
              العنوان
              <input className={inputClass} value={form.address} onChange={(e) => patch("address", e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm text-white/70">
              السجل التجاري
              <input
                className={inputClass}
                value={form.commercialRegistration}
                onChange={(e) => patch("commercialRegistration", e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm text-white/70">
              الرقم الضريبي
              <input className={inputClass} value={form.taxNumber} onChange={(e) => patch("taxNumber", e.target.value)} />
            </label>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-white/70">
              العملة
              <select className={inputClass} value={form.currency} onChange={(e) => patch("currency", e.target.value)}>
                <option value="USD">USD</option>
                <option value="IQD">IQD</option>
                <option value="AED">AED</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm text-white/70">
              اللغة
              <select
                className={inputClass}
                value={form.language}
                onChange={(e) => patch("language", e.target.value as "ar" | "en")}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        )}
        {step === 3 && (
          <label className="grid gap-1 text-sm text-white/70">
            الفرع الرئيسي
            <input className={inputClass} value={form.mainBranch} onChange={(e) => patch("mainBranch", e.target.value)} />
          </label>
        )}
        {step === 4 && (
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm text-white/70">
              اسم المدير
              <input className={inputClass} value={form.adminName} onChange={(e) => patch("adminName", e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm text-white/70">
              البريد
              <input className={inputClass} type="email" value={form.adminEmail} onChange={(e) => patch("adminEmail", e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm text-white/70">
              كلمة المرور
              <input
                className={inputClass}
                type="password"
                value={form.adminPassword}
                onChange={(e) => patch("adminPassword", e.target.value)}
              />
            </label>
          </div>
        )}
        {step === 5 && (
          <label className="grid gap-1 text-sm text-white/70">
            حجم الورق الافتراضي
            <select
              className={inputClass}
              value={form.printPaper}
              onChange={(e) => patch("printPaper", e.target.value as "a4" | "thermal-80")}
            >
              <option value="a4">A4 رسمي</option>
              <option value="thermal-80">حراري 80mm</option>
            </select>
          </label>
        )}
        {step === 6 && (
          <label className="flex items-center gap-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={form.backupEnabled}
              onChange={(e) => patch("backupEnabled", e.target.checked)}
              className="h-4 w-4 rounded border-white/20"
            />
            تفعيل النسخ الاحتياطي اليومي التلقائي
          </label>
        )}
        {step === 7 && (
          <dl className="grid gap-2 text-sm text-white/80">
            <div className="flex justify-between border-b border-white/10 py-2">
              <dt>المعرض</dt>
              <dd>{form.companyName}</dd>
            </div>
            <div className="flex justify-between border-b border-white/10 py-2">
              <dt>الفرع</dt>
              <dd>{form.mainBranch}</dd>
            </div>
            <div className="flex justify-between border-b border-white/10 py-2">
              <dt>المدير</dt>
              <dd>{form.adminName || form.adminEmail}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt>الطباعة</dt>
              <dd>{form.printPaper === "a4" ? "A4" : "80mm"}</dd>
            </div>
          </dl>
        )}

        <div className="mt-6 flex justify-between gap-3">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            السابق
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-gradient-to-r from-[#f3c96b] to-[#a77b34] px-6 py-2 text-sm font-bold text-black"
          >
            {step === steps.length - 1 ? "إنهاء الإعداد" : "التالي"}
          </button>
        </div>
      </section>
    </div>
  );
}
