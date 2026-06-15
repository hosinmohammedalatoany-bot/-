"use client";

import { useEffect, useMemo, useState } from "react";
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
import { buildPrintDocument, getPrintStyles, printHtml } from "@/lib/print";
import { wrapPrintDocument } from "@/lib/print-document";
import { AccountSecurityPanel } from "@/components/modules/account-security-panel";
import { SecurityAuditPanel } from "@/components/modules/security-audit-panel";
import { WorkspaceAdvancedPanel } from "@/components/modules/workspace-advanced-panel";

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
  const [syncing, setSyncing] = useState(true);
  const initial = readStoredSettings();
  const [logoPreview, setLogoPreview] = useState(() => initial.logoDataUrl ?? resolvePrintLogoUrl(initial));
  const [stampPreview, setStampPreview] = useState(() => initial.stampDataUrl ?? "");
  const [signaturePreview, setSignaturePreview] = useState(() => initial.signatureDataUrl ?? "");
  const form = useForm<CompanyPrintSettings>({ defaultValues: initial });
  const watched = form.watch();

  const settingsPreviewDoc = useMemo(() => {
    const fragment = wrapPrintDocument(
      { documentTitle: "معاينة إعدادات الطباعة", documentNumber: "PREVIEW-001", documentDate: new Date() },
      `<p>هذه معاينة لشكل المستندات بعد حفظ الإعدادات. تظهر الترويسة، الشعار، الختم، وتوقيع المدير حسب خياراتك.</p>
        <table><tr><th>حجم الورق</th><td>${watched.paperSize ?? "A4"}</td></tr>
        <tr><th>هامش (مم)</th><td>${watched.printMarginMm ?? 12}</td></tr></table>`,
      { ...defaultCompanyPrintSettings, ...watched }
    );
    return buildPrintDocument("معاينة الطباعة", fragment);
  }, [watched]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        const res = await fetch("/api/organization/company", { credentials: "include" });
        if (res.ok) {
          const payload = (await res.json()) as { settings?: CompanyPrintSettings };
          if (payload.settings && !cancelled) {
            form.reset(payload.settings);
            setLogoPreview(payload.settings.logoDataUrl ?? resolvePrintLogoUrl(payload.settings));
            setStampPreview(payload.settings.stampDataUrl ?? "");
            setSignaturePreview(payload.settings.signatureDataUrl ?? "");
            saveCompanyPrintSettings(payload.settings);
          }
        } else {
          const data = readStoredSettings();
          if (!cancelled) form.reset(data);
        }
      } catch {
        const data = readStoredSettings();
        if (!cancelled) form.reset(data);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
      <AccountSecurityPanel />
      <SecurityAuditPanel />

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
          onSubmit={form.handleSubmit(async (data) => {
            setLoading(true);
            try {
              const res = await fetch("/api/organization/company", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
              });
              const payload = await res.json();
              if (!res.ok) {
                log(typeof payload.error === "string" ? payload.error : ar.error);
                setLoading(false);
                return;
              }
              const saved = (payload.settings ?? data) as CompanyPrintSettings;
              saveCompanyPrintSettings(saved);
              form.reset(saved);
              setLogoPreview(saved.logoDataUrl ?? resolvePrintLogoUrl(saved));
              log("تم حفظ بيانات المعرض والطباعة على الخادم.");
            } catch {
              saveCompanyPrintSettings(data);
              setLogoPreview(data.logoDataUrl ?? resolvePrintLogoUrl(data));
              log("تم الحفظ محلياً (تعذر الاتصال بالخادم).");
            }
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
          <Field label="العملة">
            <input className={inputClass} {...form.register("currency")} placeholder="IQD" />
          </Field>
          <Field label="هامش الطباعة (مم)">
            <input type="number" className={inputClass} {...form.register("printMarginMm", { valueAsNumber: true })} />
          </Field>
          <Field label="حجم الورق">
            <select className={inputClass} {...form.register("paperSize")}>
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </select>
          </Field>
          <Field label="اسم المدير (التذييل)">
            <input className={inputClass} {...form.register("managerName")} />
          </Field>
          <Field label="منصب المدير">
            <input className={inputClass} {...form.register("managerTitle")} />
          </Field>
          <div className="md:col-span-2">
            <Field label="تذييل الفواتير والعقود">
              <textarea className={inputClass} rows={3} {...form.register("invoiceFooter")} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="نص قانوني للعقود (فقرات)">
              <textarea className={inputClass} rows={4} {...form.register("contractLegalText")} />
            </Field>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-white/80">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...form.register("showQr")} />
              إظهار QR
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...form.register("showBarcode")} />
              إظهار الباركود
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...form.register("showStamp")} />
              إظهار الختم
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...form.register("showManagerSignature")} />
              توقيع المدير
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...form.register("showClientSignature")} />
              توقيع العميل
            </label>
          </div>
          <div className="md:col-span-2 rounded-xl border border-white/10 bg-white overflow-hidden">
            <p className="bg-[#12100c] px-3 py-2 text-xs text-white/55">معاينة فورية (قبل الحفظ)</p>
            <iframe
              title="معاينة إعدادات الطباعة"
              className="h-[420px] w-full border-0 bg-white"
              srcDoc={settingsPreviewDoc}
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <PrimaryButton type="submit" disabled={loading || syncing}>
              {loading ? ar.loading : syncing ? "جاري التحميل…" : "حفظ الإعدادات"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                printHtml({
                  title: "معاينة الطباعة",
                  html: wrapPrintDocument(
                    { documentTitle: "معاينة رأس الطباعة", documentNumber: "PREVIEW-001", documentDate: new Date() },
                    "<p>هذه معاينة لشكل المستندات المطبوعة من النظام.</p>",
                    { ...defaultCompanyPrintSettings, ...form.getValues() }
                  )
                });
              }}
            >
              طباعة المعاينة
            </SecondaryButton>
          </div>
        </form>
      </section>
      <style>{getPrintStyles()}</style>

      <WorkspaceAdvancedPanel />

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
