import { apiPrintLogsEnabled, postPrintLog } from "@/lib/print-log-api";

/** Maps UI labels to API document_type slugs. */
export function printDocumentTypeSlug(labelOrKey: string): string {
  const map: Record<string, string> = {
    invoice: "invoice",
    contract: "contract",
    receipt: "receipt",
    report: "report",
    "فاتورة بيع": "invoice",
    "عقد بيع": "contract",
    "عقد تقسيط": "contract",
    "إيصال قبض": "receipt",
    تقرير: "report"
  };
  return map[labelOrKey] ?? labelOrKey;
}

export async function registerPrintEvent(
  recordPrint: (documentType: string, documentNumber: string, branch?: string) => void,
  input: { documentType: string; documentNumber: string; branch?: string }
): Promise<void> {
  const slug = printDocumentTypeSlug(input.documentType);
  recordPrint(slug, input.documentNumber, input.branch);
  if (!apiPrintLogsEnabled) return;
  try {
    await postPrintLog({
      documentType: slug,
      documentNumber: input.documentNumber,
      branchName: input.branch
    });
  } catch {
    /* offline or session — local log still recorded */
  }
}
