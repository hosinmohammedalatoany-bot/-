"use client";

import { useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { exportHtmlAsPdf, exportTableCsv, previewPrintHtml, printHtml } from "@/lib/print";
import { PrintPreviewDialog } from "@/components/print/print-preview-dialog";
import { SecondaryButton } from "@/components/ui/primitives";

export function PrintToolbar({
  title,
  printHtmlBody,
  getPrintHtml,
  csvFilename,
  csvHeaders,
  csvRows,
  onPrinted,
  embedPreview = true
}: {
  title: string;
  /** HTML جاهز للطباعة (يُقيَّم عند كل عرض إن وُجد getPrintHtml) */
  printHtmlBody: string;
  getPrintHtml?: () => string;
  csvFilename?: string;
  csvHeaders?: string[];
  csvRows?: (string | number)[][];
  onPrinted?: () => void;
  /** معاينة داخل نافذة بنفس HTML الطباعة (WYSIWYG) */
  embedPreview?: boolean;
}) {
  const [busy, setBusy] = useState<"print" | "preview" | "pdf" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSession, setPreviewSession] = useState(0);

  function resolveHtml() {
    return getPrintHtml?.() ?? printHtmlBody;
  }

  async function run(
    action: "print" | "preview" | "pdf" | "csv",
    fn: () => void | Promise<void>
  ) {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : ar.error;
      setError(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="no-print flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <SecondaryButton
          loading={busy === "print"}
          disabled={Boolean(busy)}
          onClick={() =>
            void run("print", async () => {
              printHtml({
                title,
                html: resolveHtml(),
                onPrinted,
                onError: setError
              });
            })
          }
        >
          {ar.print}
        </SecondaryButton>
        <SecondaryButton
          loading={busy === "preview"}
          disabled={Boolean(busy)}
          onClick={() =>
            void run("preview", async () => {
              if (embedPreview) {
                setPreviewSession((n) => n + 1);
                setPreviewOpen(true);
              } else {
                previewPrintHtml({ title, html: resolveHtml() });
              }
            })
          }
        >
          {embedPreview ? "معاينة المستند" : ar.printPreview}
        </SecondaryButton>
        <SecondaryButton
          loading={busy === "pdf"}
          disabled={Boolean(busy)}
          onClick={() =>
            void run("pdf", async () => {
              exportHtmlAsPdf(`${title}.pdf`, resolveHtml());
              onPrinted?.();
            })
          }
        >
          {ar.pdf}
        </SecondaryButton>
        {csvHeaders && csvRows && csvFilename && (
          <SecondaryButton
            loading={busy === "csv"}
            disabled={Boolean(busy)}
            onClick={() =>
              void run("csv", async () => {
                exportTableCsv(csvFilename, csvHeaders, csvRows);
                onPrinted?.();
              })
            }
          >
            {ar.excel}
          </SecondaryButton>
        )}
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      {embedPreview ? (
        <PrintPreviewDialog
          open={previewOpen}
          sessionKey={previewSession}
          onClose={() => setPreviewOpen(false)}
          title={title}
          buildStaticHtml={resolveHtml}
          csvFilename={csvFilename}
          csvHeaders={csvHeaders}
          csvRows={csvRows}
          onPrinted={onPrinted}
        />
      ) : null}
    </div>
  );
}
