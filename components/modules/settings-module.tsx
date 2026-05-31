"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ar } from "@/lib/i18n/ar";
import { ModulePage } from "@/components/modules/module-page";
import { Field, PrimaryButton, inputClass } from "@/components/ui/primitives";
import { useActionLog } from "@/hooks/use-action-log";

const STORAGE_KEY = "br_company_settings";

type CompanySettings = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  commercialRegister: string;
  taxNumber: string;
  invoiceFooter: string;
  printMarginMm: number;
};

const defaults: CompanySettings = {
  companyName: "براء رائد لمعارض السيارات",
  address: "العراق",
  phone: "",
  email: "",
  commercialRegister: "",
  taxNumber: "",
  invoiceFooter: "الشروط والأحكام — توقيع العميل والمدير وختم الشركة.",
  printMarginMm: 12
};

export function SettingsModule() {
  const { log, items } = useActionLog();
  const [loading, setLoading] = useState(false);
  const form = useForm<CompanySettings>({ defaultValues: defaults });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        form.reset({ ...defaults, ...JSON.parse(raw) });
      }
    } catch {
      /* ignore */
    }
  }, [form]);

  return (
    <ModulePage moduleKey="settings">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">إعدادات الشركة والطباعة</h3>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit((data) => {
            setLoading(true);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            log("تم حفظ إعدادات الشركة.");
            setLoading(false);
          })}
        >
          <Field label="اسم الشركة">
            <input className={inputClass} {...form.register("companyName")} />
          </Field>
          <Field label="الهاتف">
            <input className={inputClass} {...form.register("phone")} />
          </Field>
          <Field label="البريد">
            <input type="email" className={inputClass} {...form.register("email")} />
          </Field>
          <Field label="العنوان">
            <input className={inputClass} {...form.register("address")} />
          </Field>
          <Field label="السجل التجاري">
            <input className={inputClass} {...form.register("commercialRegister")} />
          </Field>
          <Field label="الرقم الضريبي">
            <input className={inputClass} {...form.register("taxNumber")} />
          </Field>
          <Field label="هامش الطباعة (مم)">
            <input type="number" className={inputClass} {...form.register("printMarginMm", { valueAsNumber: true })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="تذييل الفاتورة">
              <textarea className={inputClass} rows={3} {...form.register("invoiceFooter")} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? ar.loading : ar.save}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5 text-sm text-white/65">
        <h3 className="font-bold text-white">PWA والتطبيقات</h3>
        <p className="mt-2">
          ثبّت التطبيق من المتصفح (Chrome / Safari / Edge) عبر «إضافة إلى الشاشة الرئيسية». تطبيقات Flutter
          لـ iPhone وAndroid وWindows تُبنى من مجلد mobile عند تفعيل المشروع الكامل.
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
