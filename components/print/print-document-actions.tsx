"use client";

import { useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { PrintPreviewDialog } from "@/components/print/print-preview-dialog";
import { PrintToolbar } from "@/components/print/print-toolbar";
import type { InstallmentSchedulePrintRow, PrintLineItem } from "@/lib/print-line-items";

type Props = {
  title: string;
  getHtml: () => string;
  onPrinted?: () => void;
  csvFilename?: string;
  csvHeaders?: string[];
  csvRows?: (string | number)[][];
  lineItemsEditor?: {
    initialLineItems: PrintLineItem[];
    buildHtml: (items: PrintLineItem[]) => string;
  };
  scheduleEditor?: {
    initialSchedule: InstallmentSchedulePrintRow[];
    buildHtml: (rows: InstallmentSchedulePrintRow[]) => string;
  };
};

/** أزرار طباعة مع معاينة تحريرية اختيارية */
export function PrintDocumentActions(props: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSession, setPreviewSession] = useState(0);
  const hasEditor = Boolean(props.lineItemsEditor || props.scheduleEditor);

  if (!hasEditor) {
    return (
      <PrintToolbar
        title={props.title}
        printHtmlBody={props.getHtml()}
        getPrintHtml={props.getHtml}
        onPrinted={props.onPrinted}
        csvFilename={props.csvFilename}
        csvHeaders={props.csvHeaders}
        csvRows={props.csvRows}
      />
    );
  }

  return (
    <>
      <div className="no-print flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
            onClick={() => {
              setPreviewSession((n) => n + 1);
              setPreviewOpen(true);
            }}
          >
            معاينة وتحرير
          </button>
        </div>
        <p className="text-[11px] text-white/45">عدّل البنود ثم اطبع أو صدّر PDF — دون تغيير البيانات المحفوظة.</p>
      </div>
      <PrintPreviewDialog
        open={previewOpen}
        sessionKey={previewSession}
        onClose={() => setPreviewOpen(false)}
        title={props.title}
        buildStaticHtml={props.getHtml}
        editor={
          props.lineItemsEditor
            ? {
                mode: "lineItems",
                initialLineItems: props.lineItemsEditor.initialLineItems,
                buildHtml: props.lineItemsEditor.buildHtml
              }
            : props.scheduleEditor
              ? {
                  mode: "installmentSchedule",
                  initialSchedule: props.scheduleEditor.initialSchedule,
                  buildHtml: props.scheduleEditor.buildHtml
                }
              : null
        }
        csvFilename={props.csvFilename}
        csvHeaders={props.csvHeaders}
        csvRows={props.csvRows}
        onPrinted={props.onPrinted}
      />
      <PrintToolbar
        title={props.title}
        printHtmlBody={props.getHtml()}
        getPrintHtml={props.getHtml}
        onPrinted={props.onPrinted}
        csvFilename={props.csvFilename}
        csvHeaders={props.csvHeaders}
        csvRows={props.csvRows}
      />
    </>
  );
}
