"use client";

import { formatDateTime } from "@/lib/utils";
import {
  getPrinterUserName,
  loadCompanyPrintSettings,
  resolvePrintLogoUrl,
  type CompanyPrintSettings
} from "@/lib/company-print-settings";

export type PrintDocumentMeta = {
  documentTitle: string;
  documentNumber?: string;
  documentDate?: Date | string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function optionalLine(label: string, value?: string) {
  const v = value?.trim();
  if (!v) return "";
  return `<div class="print-info-line"><span class="print-info-label">${escapeHtml(label)}:</span> ${escapeHtml(v)}</div>`;
}

export function buildPrintHeaderHtml(meta: PrintDocumentMeta, settings?: CompanyPrintSettings) {
  const s = settings ?? loadCompanyPrintSettings();
  const logoUrl = resolvePrintLogoUrl(s);
  const printedAt = formatDateTime(new Date());
  const docDate = meta.documentDate ? formatDateTime(meta.documentDate) : "—";
  const printer = getPrinterUserName();

  const companyLines = [
    optionalLine("الهاتف", s.phone),
    optionalLine("البريد", s.email),
    optionalLine("السجل التجاري", s.commercialRegister),
    optionalLine("الرقم الضريبي", s.taxNumber),
    optionalLine("الفرع", s.branchName)
  ]
    .filter(Boolean)
    .join("");

  const docMeta = [
    meta.documentNumber
      ? `<div><strong>رقم المستند:</strong> ${escapeHtml(meta.documentNumber)}</div>`
      : "",
    `<div><strong>تاريخ المستند:</strong> ${escapeHtml(docDate)}</div>`
  ]
    .filter(Boolean)
    .join("");

  return `
    <header class="print-header">
      <div class="print-header-row">
        <div class="print-logo-wrap">
          <img class="print-logo" src="${logoUrl}" alt="${escapeHtml(s.companyName)}" />
        </div>
        <div class="print-company-block">
          <h1 class="print-company-name">${escapeHtml(s.companyName)}</h1>
          ${s.address?.trim() ? `<p class="print-company-address">${escapeHtml(s.address)}</p>` : ""}
          <div class="print-company-details">${companyLines}</div>
        </div>
        <div class="print-doc-block">
          <h2 class="print-doc-title">${escapeHtml(meta.documentTitle)}</h2>
          ${docMeta}
        </div>
      </div>
      <div class="print-meta-bar">
        <span><strong>وقت الطباعة:</strong> ${escapeHtml(printedAt)}</span>
        <span><strong>طبع بواسطة:</strong> ${escapeHtml(printer)}</span>
        ${s.branchName?.trim() ? `<span><strong>الفرع:</strong> ${escapeHtml(s.branchName)}</span>` : ""}
      </div>
      <hr class="print-divider" />
    </header>
  `;
}

/** صف توقيعات ثلاثي + ختم وتوقيع المدير — يُوضع قبل التذييل النصي. */
export function buildPrintSignaturesBlockHtml(settings?: CompanyPrintSettings) {
  const s = settings ?? loadCompanyPrintSettings();

  const managerSig =
    s.showManagerSignature && s.signatureDataUrl?.startsWith("data:")
      ? `<div class="print-sign-cell print-sign-manager">
          <img class="print-signature-img" src="${s.signatureDataUrl}" alt="توقيع المدير" />
          <p class="print-sign-label">${escapeHtml(s.managerName || "المدير")}</p>
          <p class="print-sign-role">${escapeHtml(s.managerTitle || "توقيع المدير")}</p>
        </div>`
      : s.showManagerSignature
        ? `<div class="print-sign-cell">
            <div class="print-sign-line">توقيع المدير</div>
            <p class="print-sign-role">${escapeHtml(s.managerName)} — ${escapeHtml(s.managerTitle)}</p>
          </div>`
        : "";

  const clientCell = s.showClientSignature
    ? `<div class="print-sign-cell"><div class="print-sign-line">توقيع العميل</div></div>`
    : "";
  const employeeCell = `<div class="print-sign-cell"><div class="print-sign-line">توقيع الموظف / المحاسب</div></div>`;

  const stamp =
    s.showStamp && s.stampDataUrl?.startsWith("data:")
      ? `<div class="print-stamp-wrap"><img class="print-stamp" src="${s.stampDataUrl}" alt="ختم الشركة" /></div>`
      : "";

  return `
    <section class="print-signatures-block">
      ${stamp}
      <div class="print-signatures-row">
        ${clientCell}
        ${employeeCell}
        ${managerSig}
      </div>
    </section>
  `;
}

export function buildPrintFooterHtml(settings?: CompanyPrintSettings) {
  const s = settings ?? loadCompanyPrintSettings();
  const printer = getPrinterUserName();
  const printedAt = formatDateTime(new Date());

  return `
    <footer class="print-footer">
      ${s.invoiceFooter?.trim() ? `<p class="print-footer-note">${escapeHtml(s.invoiceFooter)}</p>` : ""}
      <p class="print-footer-meta muted">تم الطباعة بواسطة ${escapeHtml(printer)} في ${escapeHtml(printedAt)}</p>
    </footer>
  `;
}

/** Wraps document body with branded header and optional footer. */
export function wrapPrintDocument(
  meta: PrintDocumentMeta,
  bodyHtml: string,
  settings?: CompanyPrintSettings,
  options?: { includeSignatures?: boolean }
) {
  const includeSignatures = options?.includeSignatures !== false;
  const signatures = includeSignatures ? buildPrintSignaturesBlockHtml(settings) : "";
  return `${buildPrintHeaderHtml(meta, settings)}<div class="print-body">${bodyHtml}</div>${signatures}${buildPrintFooterHtml(settings)}`;
}
