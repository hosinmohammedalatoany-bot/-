import type { PrintedDocument } from "@/lib/domain";

export const apiPrintLogsEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

export function printLogFromApi(row: Record<string, unknown>): PrintedDocument {
  return {
    id: String(row.id),
    documentType: String(row.document_type ?? "invoice"),
    documentNumber: String(row.document_number ?? ""),
    branch: String(row.branch_name ?? "الفرع الرئيسي"),
    printCount: Number(row.print_count ?? 1),
    status: "success",
    printedAt: String(row.printed_at ?? new Date().toISOString()),
    actor: String(row.actor_name ?? "—")
  };
}

export async function postPrintLog(input: {
  documentType: string;
  documentNumber: string;
  branchName?: string;
}): Promise<void> {
  if (!apiPrintLogsEnabled) return;
  await fetch("/api/printing/logs", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_type: input.documentType,
      document_number: input.documentNumber,
      branch_name: input.branchName
    })
  });
}
