import { NextResponse } from "next/server";
import { hashPassword, isStrongPassword, readDb, writeDb } from "@/lib/server/db";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string; password?: string; confirm?: string };
  const token = body.token?.trim();
  const password = body.password ?? "";
  const confirm = body.confirm ?? "";

  if (!token) {
    return NextResponse.json({ error: "رمز الاستعادة غير صالح." }, { status: 400 });
  }
  if (password !== confirm) {
    return NextResponse.json({ error: "كلمتا المرور غير متطابقتين." }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: "كلمة المرور ضعيفة." }, { status: 400 });
  }

  const db = await readDb();
  const reset = db.resetTokens.find((item) => item.token === token && !item.used);
  if (!reset || new Date(reset.expiresAt) < new Date()) {
    return NextResponse.json({ error: "انتهت صلاحية الرابط أو تم استخدامه." }, { status: 400 });
  }

  const user = db.users.find((item) => item.email === reset.email);
  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });
  }

  user.passwordHash = hashPassword(password);
  user.failedAttempts = 0;
  user.lockedUntil = undefined;
  reset.used = true;

  await writeDb(db);
  return NextResponse.json({ ok: true, message: "تم تحديث كلمة المرور." });
}
