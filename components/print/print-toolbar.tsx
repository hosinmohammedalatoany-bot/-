"use client";

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
  return (
    <div className="no-print flex flex-wrap gap-2">
      <SecondaryButton
        onClick={() => {
          printHtml({ title, html: printHtmlBody, onPrinted });
        }}
      >
        {ar.print}
      </SecondaryButton>
      <SecondaryButton
        onClick={() => {
          exportHtmlAsPdf(`${title}.pdf`, printHtmlBody);
          onPrinted?.();
        }}
      >
        {ar.pdf}
      </SecondaryButton>
      {csvHeaders && csvRows && csvFilename && (
        <SecondaryButton
          onClick={() => {
            exportTableCsv(csvFilename, csvHeaders, csvRows);
            onPrinted?.();
          }}
        >
          {ar.excel}
        </SecondaryButton>
      )}
    </div>
  );
}
