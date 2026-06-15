export type ReportPayload = {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
  row_count?: number;
};

export function reportFromApi(raw: Record<string, unknown>): ReportPayload {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? "تقرير"),
    headers: Array.isArray(raw.headers) ? raw.headers.map(String) : [],
    rows: Array.isArray(raw.rows)
      ? raw.rows.map((row) =>
          Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []
        )
      : [],
    row_count: typeof raw.row_count === "number" ? raw.row_count : undefined
  };
}
