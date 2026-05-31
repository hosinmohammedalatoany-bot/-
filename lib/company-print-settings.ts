"use client";

export const COMPANY_SETTINGS_STORAGE_KEY = "br_company_settings";

/** Inline fallback when no custom logo is uploaded (always renders in print/PDF). */
export const DEFAULT_LOGO_PATH = "/brand/logo-transparent.svg";

export type CompanyPrintSettings = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  commercialRegister: string;
  taxNumber: string;
  branchName: string;
  invoiceFooter: string;
  printMarginMm: number;
  /** Base64 data URL (PNG/JPG/SVG) */
  logoDataUrl?: string;
  stampDataUrl?: string;
  signatureDataUrl?: string;
};

export const defaultCompanyPrintSettings: CompanyPrintSettings = {
  companyName: "براء رائد لمعارض السيارات",
  address: "العراق",
  phone: "",
  email: "",
  commercialRegister: "",
  taxNumber: "",
  branchName: "",
  invoiceFooter: "الشروط والأحكام — توقيع العميل والمدير وختم الشركة.",
  printMarginMm: 12
};

export function loadCompanyPrintSettings(): CompanyPrintSettings {
  if (typeof window === "undefined") return { ...defaultCompanyPrintSettings };
  try {
    const raw = localStorage.getItem(COMPANY_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...defaultCompanyPrintSettings };
    return { ...defaultCompanyPrintSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultCompanyPrintSettings };
  }
}

export function saveCompanyPrintSettings(settings: CompanyPrintSettings) {
  localStorage.setItem(COMPANY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function getPrinterUserName(): string {
  if (typeof window === "undefined") return "—";
  try {
    const raw = localStorage.getItem("br_user");
    if (!raw) return "—";
    const user = JSON.parse(raw) as { name?: string; email?: string };
    return user.name?.trim() || user.email?.trim() || "—";
  } catch {
    return "—";
  }
}

/** Logo for print iframe: custom upload, else site default asset. */
export function resolvePrintLogoUrl(settings?: CompanyPrintSettings): string {
  const s = settings ?? loadCompanyPrintSettings();
  if (s.logoDataUrl?.startsWith("data:")) return s.logoDataUrl;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${DEFAULT_LOGO_PATH}`;
  }
  return DEFAULT_LOGO_PATH;
}
