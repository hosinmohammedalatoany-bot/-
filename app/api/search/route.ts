import { NextResponse } from "next/server";

/** Server-side search stub — client search runs in Zustand; this supports future API-backed search. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  return NextResponse.json({
    results: [],
    message: "استخدم البحث الشامل داخل لوحة التحكم (IndexedDB). هذا المسار جاهز للربط بـ PostgreSQL."
  });
}
