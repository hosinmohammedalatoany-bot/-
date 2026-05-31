"use client";

export interface PrintOptions {
  title: string;
  html: string;
  onPrinted?: () => void;
}

const PRINT_STYLES = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    direction: rtl;
    font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    color: #111;
    background: #fff;
  }
  h1, h2, h3 { margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 13px; }
  th { background: #f5f5f5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .brand { font-size: 22px; font-weight: 800; color: #96703a; }
  .muted { color: #666; font-size: 12px; }
  .totals { margin-top: 16px; text-align: left; }
  .totals div { margin: 4px 0; }
  .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sign-line { border-top: 1px solid #333; padding-top: 8px; text-align: center; }
`;

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
  doc.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${title}</title><style>${PRINT_STYLES}</style></head><body>${html}</body></html>`);
  doc.close();

  const runPrint = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    onPrinted?.();
    setTimeout(() => {
      document.body.removeChild(frame);
    }, 1000);
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
  const full = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><style>${PRINT_STYLES}</style></head><body>${html}<p class="muted">افتح الملف واختر «طباعة إلى PDF» من المتصفح.</p></body></html>`;
  downloadBlob(filename.replace(/\.pdf$/, "") + ".html", full, "text/html;charset=utf-8");
}
