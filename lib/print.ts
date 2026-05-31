"use client";

import { loadCompanyPrintSettings } from "@/lib/company-print-settings";

export interface PrintOptions {
  title: string;
  html: string;
  onPrinted?: () => void;
}

export function getPrintStyles() {
  const margin = loadCompanyPrintSettings().printMarginMm || 12;
  return `
  @page { size: A4; margin: ${margin}mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 16px 20px 24px;
    direction: rtl;
    font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    color: #111;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1, h2, h3 { margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 13px; }
  th { background: #f5f5f5; }
  .muted { color: #666; font-size: 12px; }
  .totals { margin-top: 16px; text-align: left; }
  .totals div { margin: 4px 0; }
  .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sign-line { border-top: 1px solid #333; padding-top: 8px; text-align: center; }

  .print-header { margin-bottom: 8px; }
  .print-header-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .print-logo-wrap { flex: 0 0 auto; }
  .print-logo {
    display: block;
    max-width: 140px;
    max-height: 72px;
    width: auto;
    height: auto;
    object-fit: contain;
  }
  .print-company-block { flex: 1 1 200px; min-width: 180px; }
  .print-company-name {
    font-size: 20px;
    font-weight: 800;
    color: #96703a;
    margin: 0 0 4px;
  }
  .print-company-address { margin: 0 0 6px; font-size: 12px; color: #444; }
  .print-company-details { font-size: 11px; color: #555; line-height: 1.5; }
  .print-info-line { margin: 2px 0; }
  .print-info-label { color: #666; }
  .print-doc-block { flex: 0 1 220px; text-align: left; font-size: 13px; }
  .print-doc-title {
    font-size: 16px;
    font-weight: 700;
    color: #222;
    margin: 0 0 8px;
    text-align: left;
  }
  .print-meta-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 24px;
    font-size: 11px;
    color: #555;
    margin-top: 10px;
  }
  .print-divider {
    border: none;
    border-top: 2px solid #96703a;
    margin: 12px 0 16px;
  }
  .print-body h2 { font-size: 15px; margin-top: 16px; }
  .print-footer {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #ddd;
    font-size: 11px;
    color: #555;
  }
  .print-footer-note { margin: 0 0 12px; line-height: 1.6; }
  .print-footer-images {
    display: flex;
    gap: 24px;
    align-items: flex-end;
    justify-content: flex-start;
  }
  .print-stamp, .print-signature {
    max-height: 64px;
    max-width: 120px;
    object-fit: contain;
  }
  .print-codes-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-top: 24px;
    padding: 16px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    page-break-inside: avoid;
  }
  .print-code-cell { text-align: center; }
  .print-code-img { display: block; margin: 0 auto; max-width: 100%; }
  .print-qr { width: 128px; height: 128px; }
  .print-barcode { max-height: 72px; width: auto; }
  .print-code-caption { margin: 8px 0 0; font-size: 11px; color: #555; }
  @media print {
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
  }
`;
}

function buildPrintDocument(title: string, html: string) {
  const safeTitle = title.replace(/</g, "").replace(/>/g, "");
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${safeTitle}</title><style>${getPrintStyles()}</style></head><body>${html}</body></html>`;
}

/** Opens a dedicated print document (avoids blank dashboard print). */
export function printHtml({ title, html, onPrinted }: PrintOptions) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "none";
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(frame);
    return;
  }

  doc.open();
  doc.write(buildPrintDocument(title, html));
  doc.close();

  const runPrint = () => {
    const imgs = frame.contentWindow?.document.querySelectorAll(
      "img.print-logo, img.print-stamp, img.print-signature, img.print-code-img"
    );
    const waitForImages = () => {
      if (!imgs || imgs.length === 0) {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        onPrinted?.();
        setTimeout(() => document.body.removeChild(frame), 1000);
        return;
      }
      let pending = imgs.length;
      const done = () => {
        pending -= 1;
        if (pending <= 0) {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          onPrinted?.();
          setTimeout(() => document.body.removeChild(frame), 1000);
        }
      };
      imgs.forEach((img) => {
        const el = img as HTMLImageElement;
        if (el.complete) done();
        else {
          el.onload = done;
          el.onerror = done;
        }
      });
    };
    setTimeout(waitForImages, 100);
  };

  if (frame.contentWindow?.document.readyState === "complete") {
    setTimeout(runPrint, 150);
  } else {
    frame.onload = () => setTimeout(runPrint, 150);
  }
}

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportTableCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))];
  downloadBlob(filename, lines.join("\n"), "text/csv;charset=utf-8");
}

export function exportHtmlAsPdf(filename: string, html: string) {
  const full = buildPrintDocument(
    filename.replace(/\.pdf$/i, ""),
    `${html}<p class="muted" style="margin-top:24px">افتح الملف في المتصفح واختر «طباعة إلى PDF» من Chrome أو Edge أو Safari.</p>`
  );
  downloadBlob(filename.replace(/\.pdf$/i, "") + ".html", full, "text/html;charset=utf-8");
}
