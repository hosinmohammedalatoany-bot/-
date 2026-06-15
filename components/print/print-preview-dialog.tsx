"use client";

import { useMemo, useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { absolutizePrintAssetUrls, buildPrintDocument, exportHtmlAsPdf, exportTableCsv, getPrintStyles, printHtml } from "@/lib/print";
import { PrintLineItemsEditor } from "@/components/print/print-line-items-editor";
import type { InstallmentSchedulePrintRow, PrintLineItem } from "@/lib/print-line-items";
import { PrimaryButton, SecondaryButton } from "@/components/ui/primitives";

type EditorConfig =
  | {
      mode: "lineItems";
      initialLineItems: PrintLineItem[];
      buildHtml: (items: PrintLineItem[]) => string;
    }
  | {
      mode: "installmentSchedule";
      initialSchedule: InstallmentSchedulePrintRow[];
      buildHtml: (rows: InstallmentSchedulePrintRow[]) => string;
    }
  | null;

function PrintPreviewDialogContent({
  onClose,
  title,
  buildStaticHtml,
  editor,
  csvFilename,
  csvHeaders,
  csvRows,
  onPrinted
}: {
  onClose: () => void;
  title: string;
  buildStaticHtml?: () => string;
  editor?: EditorConfig;
  csvFilename?: string;
  csvHeaders?: string[];
  csvRows?: (string | number)[][];
  onPrinted?: () => void;
}) {
  const [lineItems, setLineItems] = useState<PrintLineItem[]>(
    editor?.mode === "lineItems" ? editor.initialLineItems : []
  );
  const [schedule, setSchedule] = useState<InstallmentSchedulePrintRow[]>(
    editor?.mode === "installmentSchedule" ? editor.initialSchedule : []
  );
  const [busy, setBusy] = useState<"print" | "pdf" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const html = useMemo(() => {
    if (editor?.mode === "lineItems") return editor.buildHtml(lineItems);
    if (editor?.mode === "installmentSchedule") return editor.buildHtml(schedule);
    return buildStaticHtml?.() ?? "";
  }, [editor, lineItems, schedule, buildStaticHtml]);

  const previewDoc = useMemo(() => {
    const body = absolutizePrintAssetUrls(html);
    return buildPrintDocument(title, body);
  }, [html, title]);

  function restore() {
    if (editor?.mode === "lineItems") setLineItems(editor.initialLineItems);
    if (editor?.mode === "installmentSchedule") setSchedule(editor.initialSchedule);
  }

  async function run(action: "print" | "pdf" | "csv", fn: () => void | Promise<void>) {
    setBusy(action);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : ar.error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="no-print fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-[#12100c] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">معاينة قبل الطباعة</h3>
            <p className="text-xs text-white/50">{title} — التعديلات هنا للطباعة فقط ولا تُحفظ تلقائياً</p>
          </div>
          <SecondaryButton onClick={onClose}>إغلاق</SecondaryButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {editor?.mode === "lineItems" && (
            <PrintLineItemsEditor
              mode="lineItems"
              lineItems={lineItems}
              onLineItemsChange={setLineItems}
              onRestore={restore}
            />
          )}
          {editor?.mode === "installmentSchedule" && (
            <PrintLineItemsEditor
              mode="installmentSchedule"
              scheduleRows={schedule}
              onScheduleChange={setSchedule}
              onRestore={restore}
            />
          )}

          <div className="overflow-auto rounded-xl border border-white/10 bg-white">
            <iframe
              title="معاينة المستند"
              className="h-[min(70vh,900px)] w-full min-h-[480px] border-0 bg-white"
              srcDoc={previewDoc}
            />
          </div>
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
          <PrimaryButton
            disabled={Boolean(busy)}
            onClick={() =>
              void run("print", async () => {
                printHtml({ title, html, onPrinted, onError: setError });
              })
            }
          >
            {busy === "print" ? ar.loading : ar.print}
          </PrimaryButton>
          <SecondaryButton
            disabled={Boolean(busy)}
            onClick={() => {
              const win = window.open("", "_blank");
              if (win) {
                win.document.write(previewDoc);
                win.document.close();
              }
            }}
          >
            {ar.printPreview} (تبويب)
          </SecondaryButton>
          <SecondaryButton
            disabled={Boolean(busy)}
            onClick={() =>
              void run("pdf", async () => {
                exportHtmlAsPdf(`${title}.pdf`, html);
                onPrinted?.();
              })
            }
          >
            {busy === "pdf" ? ar.loading : ar.pdf}
          </SecondaryButton>
          {csvHeaders && csvRows && csvFilename && (
            <SecondaryButton
              disabled={Boolean(busy)}
              onClick={() =>
                void run("csv", async () => {
                  exportTableCsv(csvFilename, csvHeaders, csvRows);
                  onPrinted?.();
                })
              }
            >
              {busy === "csv" ? ar.loading : ar.excel}
            </SecondaryButton>
          )}
        </div>
      </div>
      <style>{getPrintStyles()}</style>
    </div>
  );
}

export function PrintPreviewDialog({
  open,
  onClose,
  title,
  buildStaticHtml,
  editor,
  csvFilename,
  csvHeaders,
  csvRows,
  onPrinted,
  sessionKey = 0
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  buildStaticHtml?: () => string;
  editor?: EditorConfig;
  csvFilename?: string;
  csvHeaders?: string[];
  csvRows?: (string | number)[][];
  onPrinted?: () => void;
  /** يُزيد عند فتح المعاينة لإعادة تهيئة محرر البنود دون useEffect */
  sessionKey?: number;
}) {
  if (!open) return null;

  return (
    <PrintPreviewDialogContent
      key={sessionKey}
      onClose={onClose}
      title={title}
      buildStaticHtml={buildStaticHtml}
      editor={editor}
      csvFilename={csvFilename}
      csvHeaders={csvHeaders}
      csvRows={csvRows}
      onPrinted={onPrinted}
    />
  );
}
