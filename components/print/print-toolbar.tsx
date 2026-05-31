"use client";

import { useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { exportHtmlAsPdf, exportTableCsv, previewPrintHtml, printHtml } from "@/lib/print";
import { SecondaryButton } from "@/components/ui/primitives";

export function PrintToolbar({
  title,
  printHtmlBody,
  csvFilename,
  csvHeaders,
  csvRows,
  onPrinted
}: {
  title: string;
  printHtmlBody: string;
  csvFilename?: string;
  csvHeaders?: string[];
  csvRows?: (string | number)[][];
  onPrinted?: () => void;
}) {
  const [busy, setBusy] = useState<"print" | "preview" | "pdf" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                html: printHtmlBody,
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
              previewPrintHtml({ title, html: printHtmlBody });
            })
          }
        >
          {ar.printPreview}
        </SecondaryButton>
        <SecondaryButton
          loading={busy === "pdf"}
          disabled={Boolean(busy)}
          onClick={() =>
            void run("pdf", async () => {
              exportHtmlAsPdf(`${title}.pdf`, printHtmlBody);
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
    </div>
  );
}
