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

export function buildPrintFooterHtml(settings?: CompanyPrintSettings) {
  const s = settings ?? loadCompanyPrintSettings();
  const stamp = s.stampDataUrl?.startsWith("data:")
    ? `<img class="print-stamp" src="${s.stampDataUrl}" alt="ختم" />`
    : "";
  const signature = s.signatureDataUrl?.startsWith("data:")
    ? `<img class="print-signature" src="${s.signatureDataUrl}" alt="توقيع" />`
    : "";

  return `
    <footer class="print-footer">
      ${s.invoiceFooter?.trim() ? `<p class="print-footer-note">${escapeHtml(s.invoiceFooter)}</p>` : ""}
      <div class="print-footer-images">
        ${stamp}
        ${signature}
      </div>
    </footer>
  `;
}

/** Wraps document body with branded header and optional footer. */
export function wrapPrintDocument(meta: PrintDocumentMeta, bodyHtml: string, settings?: CompanyPrintSettings) {
  return `${buildPrintHeaderHtml(meta, settings)}<div class="print-body">${bodyHtml}</div>${buildPrintFooterHtml(settings)}`;
}
