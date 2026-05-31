"use client";

import { useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { exportHtmlAsPdf, exportTableCsv, printHtml } from "@/lib/print";
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
  const [busy, setBusy] = useState<"print" | "pdf" | "csv" | null>(null);

  async function run(action: "print" | "pdf" | "csv", fn: () => void | Promise<void>) {
    if (busy) return;
    setBusy(action);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <SecondaryButton
        loading={busy === "print"}
        disabled={Boolean(busy)}
        onClick={() =>
          void run("print", async () => {
            printHtml({ title, html: printHtmlBody, onPrinted });
          })
        }
      >
        {ar.print}
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
  );
}
