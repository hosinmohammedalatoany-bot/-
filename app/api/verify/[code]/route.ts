import { NextResponse } from "next/server";

/** Public document verification — in production, load from database by code. */
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  if (!code || code.length < 4) {
    return NextResponse.json({ error: "رمز التحقق غير صالح." }, { status: 400 });
  }

  return NextResponse.json({
    code,
    status: "صالح / Valid",
    amount: undefined,
    customer: "—",
    vehicle: "—",
    issuedAt: new Date().toISOString(),
    note: "اربط هذا المسار بقاعدة البيانات وسجل الطباعة للتحقق الكامل."
  });
}
