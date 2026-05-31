"use client";

import { loadCompanyPrintSettings } from "@/lib/company-print-settings";

export const PRINT_ROOT_ID = "print-root";
const PRINT_STYLE_ID = "print-session-styles";

export interface PrintOptions {
  title: string;
  html: string;
  onPrinted?: () => void;
  onError?: (message: string) => void;
}

export class PrintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintError";
  }
}

function getOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin.replace(/\/$/, "");
}

/** Turn relative same-origin paths into absolute URLs (required in print iframe / tunnel). */
export function absolutizePrintAssetUrls(html: string, origin = getOrigin()): string {
  if (!origin) return html;
  return html.replace(
    /(\s(?:src|href)=["'])(\/(?!\/)[^"']*)(["'])/gi,
    (_, prefix, path, suffix) => `${prefix}${origin}${path}${suffix}`
  );
}

export function getPrintStyles() {
  const margin = loadCompanyPrintSettings().printMarginMm || 12;
  return `
  @page { size: A4; margin: ${margin}mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    direction: rtl;
    font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    color: #111;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #${PRINT_ROOT_ID},
  #${PRINT_ROOT_ID} .print-document {
    margin: 0;
    padding: 16px 20px 24px;
    background: #fff;
    color: #111;
  }
  h1, h2, h3 { margin: 0 0 8px; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 13px; color: #111; }
  th { background: #f5f5f5 !important; }
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
    display: block !important;
    max-width: 140px;
    max-height: 72px;
    width: auto;
    height: auto;
    object-fit: contain;
    visibility: visible !important;
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
    display: block !important;
    max-height: 64px;
    max-width: 120px;
    object-fit: contain;
    visibility: visible !important;
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
  .print-code-img {
    display: block !important;
    margin: 0 auto;
    max-width: 100%;
    visibility: visible !important;
  }
  .print-qr { width: 128px; height: 128px; }
  .print-barcode { max-height: 72px; width: auto; }
  .print-code-caption { margin: 8px 0 0; font-size: 11px; color: #555; }

  @media print {
    table { page-break-inside: auto; }
    tr, thead, tfoot { page-break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    img { max-width: 100%; }
  }
`;
}

/** Styles injected only during an in-page print session (#print-root). */
function getPrintRootSessionStyles() {
  return `
  @media screen {
    #${PRINT_ROOT_ID} {
      display: none !important;
    }
  }
  @media print {
    body.print-session > *:not(#${PRINT_ROOT_ID}) {
      display: none !important;
    }
    body.print-session #${PRINT_ROOT_ID} {
      display: block !important;
      visibility: visible !important;
      position: static !important;
      width: 100% !important;
      max-width: none !important;
      inset: auto !important;
      background: #fff !important;
    }
    body.print-session #${PRINT_ROOT_ID} * {
      visibility: visible !important;
    }
  }
`;
}

export function ensurePrintRoot(): HTMLElement {
  if (typeof document === "undefined") {
    throw new PrintError("الطباعة متاحة من المتصفح فقط.");
  }
  let root = document.getElementById(PRINT_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = PRINT_ROOT_ID;
    root.className = "print-area";
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
  }
  return root;
}

function ensurePrintSessionStyles() {
  let el = document.getElementById(PRINT_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = PRINT_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = `${getPrintStyles()}\n${getPrintRootSessionStyles()}`;
  return el;
}

function clearPrintSession() {
  const root = document.getElementById(PRINT_ROOT_ID);
  if (root) {
    root.innerHTML = "";
    root.classList.remove("print-active");
    root.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("print-session");
  const styleEl = document.getElementById(PRINT_STYLE_ID);
  if (styleEl) styleEl.textContent = "";
}

function validatePrintHtml(html: string) {
  const trimmed = html?.trim() ?? "";
  if (!trimmed) {
    throw new PrintError("لا يوجد محتوى للطباعة. تأكد من اختيار فاتورة أو تقرير صالح.");
  }
  const textOnly = trimmed.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
  if (textOnly.length < 8 && !/<img\b/i.test(trimmed)) {
    throw new PrintError("محتوى الطباعة فارغ تقريباً. أعد تحميل الصفحة وحاول مرة أخرى.");
  }
}

export function buildPrintDocument(title: string, html: string) {
  const safeTitle = title.replace(/</g, "").replace(/>/g, "");
  const origin = getOrigin();
  const body = absolutizePrintAssetUrls(html, origin);
  const baseTag = origin ? `<base href="${origin}/"/>` : "";
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>${baseTag}<title>${safeTitle}</title><style>${getPrintStyles()}</style></head><body><div class="print-document">${body}</div></body></html>`;
}

function waitForImages(container: ParentNode): Promise<void> {
  const imgs = container.querySelectorAll(
    "img.print-logo, img.print-stamp, img.print-signature, img.print-code-img, img"
  );
  if (!imgs.length) return Promise.resolve();

  return new Promise((resolve) => {
    let pending = imgs.length;
    const done = () => {
      pending -= 1;
      if (pending <= 0) resolve();
    };
    imgs.forEach((img) => {
      const el = img as HTMLImageElement;
      if (el.complete && el.naturalWidth > 0) done();
      else {
        el.onload = done;
        el.onerror = done;
      }
    });
    setTimeout(resolve, 4000);
  });
}

function afterLayout(cb: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(cb, 80);
    });
  });
}

function waitForImagesInFrame(frame: HTMLIFrameElement): Promise<void> {
  const doc = frame.contentDocument;
  if (!doc?.body) return Promise.resolve();
  return waitForImages(doc.body);
}

/** Hidden iframe print — fallback when print-root is unavailable. */
function printViaIframe(title: string, html: string, onPrinted?: () => void) {
  const frame = document.createElement("iframe") as HTMLIFrameElement;
  frame.setAttribute("title", title);
  frame.style.position = "fixed";
  frame.style.left = "-10000px";
  frame.style.top = "0";
  frame.style.width = "210mm";
  frame.style.height = "297mm";
  frame.style.border = "none";
  frame.style.visibility = "hidden";
  document.body.appendChild(frame);

  const docHtml = buildPrintDocument(title, html);

  const cleanup = () => {
    setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 1200);
  };

  const runPrint = () => {
    void waitForImagesInFrame(frame).then(() => {
      afterLayout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          onPrinted?.();
        } finally {
          cleanup();
        }
      });
    });
  };

  const doc = frame.contentWindow?.document;
  if (!doc) {
    cleanup();
    throw new PrintError("تعذر فتح نافذة الطباعة في هذا المتصفح.");
  }

  frame.onload = () => runPrint();
  doc.open();
  doc.write(docHtml);
  doc.close();

  if (doc.readyState === "complete") {
    runPrint();
  }
}

/** Primary path: inject into #print-root then window.print on the main document. */
function printViaPrintRoot(title: string, html: string, onPrinted?: () => void) {
  const root = ensurePrintRoot();
  ensurePrintSessionStyles();

  const body = absolutizePrintAssetUrls(html);
  root.innerHTML = `<div class="print-document" role="document" aria-label="${title.replace(/"/g, "")}">${body}</div>`;
  root.classList.add("print-active");
  root.removeAttribute("aria-hidden");
  document.body.classList.add("print-session");

  void waitForImages(root).then(() => {
    afterLayout(() => {
      try {
        window.focus();
        window.print();
        onPrinted?.();
      } finally {
        setTimeout(clearPrintSession, 300);
      }
    });
  });
}

/**
 * Print invoice/report HTML with layout wait — avoids blank pages.
 * Uses #print-root on the page; falls back to a hidden iframe if needed.
 */
export function printHtml({ title, html, onPrinted, onError }: PrintOptions) {
  try {
    validatePrintHtml(html);
    try {
      printViaPrintRoot(title, html, onPrinted);
    } catch {
      printViaIframe(title, html, onPrinted);
    }
  } catch (e) {
    const message = e instanceof PrintError ? e.message : "فشلت الطباعة. حاول مرة أخرى.";
    onError?.(message);
    if (typeof window !== "undefined") window.alert(message);
  }
}

/** Opens print preview in a new tab (same HTML as print). */
export function previewPrintHtml({ title, html }: Pick<PrintOptions, "title" | "html">) {
  validatePrintHtml(html);
  const doc = buildPrintDocument(title, html);
  const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(url);
    throw new PrintError("تعذر فتح المعاينة. اسمح بالنوافذ المنبثقة.");
  }
  win.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
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
  const lines = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ];
  downloadBlob(filename, lines.join("\n"), "text/csv;charset=utf-8");
}

export function exportHtmlAsPdf(filename: string, html: string) {
  validatePrintHtml(html);
  const full = buildPrintDocument(
    filename.replace(/\.pdf$/i, ""),
    `${html}<p class="muted" style="margin-top:24px">افتح الملف في المتصفح واختر «طباعة إلى PDF» من Chrome أو Edge.</p>`
  );
  downloadBlob(filename.replace(/\.pdf$/i, "") + ".html", full, "text/html;charset=utf-8");
}
