"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ar } from "@/lib/i18n/ar";
import { ModulePage } from "@/components/modules/module-page";
import { Field, PrimaryButton, SecondaryButton, inputClass } from "@/components/ui/primitives";
import { useActionLog } from "@/hooks/use-action-log";
import {
  COMPANY_SETTINGS_STORAGE_KEY,
  defaultCompanyPrintSettings,
  loadCompanyPrintSettings,
  resolvePrintLogoUrl,
  saveCompanyPrintSettings,
  type CompanyPrintSettings
} from "@/lib/company-print-settings";
import { wrapPrintDocument } from "@/lib/print-document";
import { printHtml } from "@/lib/print";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("حجم الصورة كبير جداً (الحد الأقصى 2 ميجابايت)."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذر قراءة الملف."));
    reader.readAsDataURL(file);
  });
}

function readStoredSettings(): CompanyPrintSettings {
  return loadCompanyPrintSettings();
}

export function SettingsModule() {
  const { log, items } = useActionLog();
  const [loading, setLoading] = useState(false);
  const initial = readStoredSettings();
  const [logoPreview, setLogoPreview] = useState(() => initial.logoDataUrl ?? resolvePrintLogoUrl(initial));
  const [stampPreview, setStampPreview] = useState(() => initial.stampDataUrl ?? "");
  const [signaturePreview, setSignaturePreview] = useState(() => initial.signatureDataUrl ?? "");
  const form = useForm<CompanyPrintSettings>({ defaultValues: initial });

  useEffect(() => {
    const data = readStoredSettings();
    form.reset(data);
  }, [form]);

  async function onPickImage(
    file: File | undefined,
    field: "logoDataUrl" | "stampDataUrl" | "signatureDataUrl",
    setPreview: (v: string) => void
  ) {
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      form.setValue(field, dataUrl);
      setPreview(dataUrl);
      log(`تم تحميل ${field === "logoDataUrl" ? "الشعار" : field === "stampDataUrl" ? "الختم" : "التوقيع"}.`);
    } catch (e) {
      log(e instanceof Error ? e.message : ar.error);
    }
  }

  function clearImage(field: "logoDataUrl" | "stampDataUrl" | "signatureDataUrl", setPreview: (v: string) => void) {
    form.setValue(field, undefined);
    if (field === "logoDataUrl") {
      setPreview(resolvePrintLogoUrl(loadCompanyPrintSettings()));
    } else {
      setPreview("");
    }
    log(field === "logoDataUrl" ? "تم إزالة الشعار المخصص (سيُستخدم الشعار الافتراضي)." : "تم الحذف.");
  }

  return (
    <ModulePage moduleKey="settings">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">بيانات المعرض والطباعة</h3>
        <p className="mt-1 text-sm text-white/55">
          تُستخدم هذه البيانات تلقائياً في كل الفواتير والعقود والإيصالات والتقارير عند الطباعة أو تصدير PDF.
        </p>

        <div className="mt-4 flex flex-wrap items-start gap-6">
          <div>
            <p className="mb-2 text-sm text-white/70">شعار المعرض</p>
            <div className="grid h-24 w-48 place-items-center rounded-xl border border-white/15 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoPreview || resolvePrintLogoUrl()} alt="معاينة الشعار" className="max-h-20 max-w-full object-contain" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-xl border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/5">
                رفع شعار
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => onPickImage(e.target.files?.[0], "logoDataUrl", setLogoPreview)}
                />
              </label>
              <SecondaryButton onClick={() => clearImage("logoDataUrl", setLogoPreview)}>
                حذف الشعار
              </SecondaryButton>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-white/70">ختم المعرض (اختياري)</p>
            {stampPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stampPreview} alt="ختم" className="mb-2 max-h-16 object-contain" />
            ) : (
              <p className="mb-2 text-xs text-white/40">لم يُرفع ختم</p>
            )}
            <label className="cursor-pointer rounded-xl border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/5">
              رفع ختم
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0], "stampDataUrl", setStampPreview)}
              />
            </label>
            {stampPreview && (
              <span className="ms-2 inline-block">
                <SecondaryButton onClick={() => clearImage("stampDataUrl", setStampPreview)}>حذف</SecondaryButton>
              </span>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm text-white/70">توقيع المدير (اختياري)</p>
            {signaturePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signaturePreview} alt="توقيع" className="mb-2 max-h-16 object-contain" />
            ) : (
              <p className="mb-2 text-xs text-white/40">لم يُرفع توقيع</p>
            )}
            <label className="cursor-pointer rounded-xl border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/5">
              رفع توقيع
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0], "signatureDataUrl", setSignaturePreview)}
              />
            </label>
            {signaturePreview && (
              <span className="ms-2 inline-block">
                <SecondaryButton onClick={() => clearImage("signatureDataUrl", setSignaturePreview)}>حذف</SecondaryButton>
              </span>
            )}
          </div>
        </div>

        <form
          className="mt-6 grid gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit((data) => {
            setLoading(true);
            saveCompanyPrintSettings(data);
            setLogoPreview(data.logoDataUrl ?? resolvePrintLogoUrl(data));
            log("تم حفظ بيانات المعرض والطباعة.");
            setLoading(false);
          })}
        >
          <Field label="اسم المعرض">
            <input className={inputClass} {...form.register("companyName")} />
          </Field>
          <Field label="اسم الفرع">
            <input className={inputClass} {...form.register("branchName")} placeholder="اختياري" />
          </Field>
          <Field label="الهاتف">
            <input className={inputClass} {...form.register("phone")} />
          </Field>
          <Field label="البريد الإلكتروني">
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
            <Field label="تذييل الفواتير والعقود">
              <textarea className={inputClass} rows={3} {...form.register("invoiceFooter")} />
            </Field>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? ar.loading : "حفظ الإعدادات"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                const sample = wrapPrintDocument(
                  { documentTitle: "معاينة رأس الطباعة", documentNumber: "PREVIEW-001", documentDate: new Date() },
                  "<p>هذه معاينة لشكل المستندات المطبوعة من النظام.</p>"
                );
                printHtml({ title: "معاينة الطباعة", html: sample });
              }}
            >
              معاينة الطباعة
            </SecondaryButton>
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
