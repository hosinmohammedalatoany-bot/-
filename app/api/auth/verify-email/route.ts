import { NextResponse } from "next/server";
import { appendAuditLog, readDb, writeDb } from "@/lib/server/db";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "رمز التحقق مفقود." }, { status: 400 });
  }

  const db = await readDb();
  const record = db.emailVerificationTokens.find((t) => t.token === token && !t.used);
  if (!record) {
    return NextResponse.json({ error: "رابط التحقق غير صالح أو مستخدم." }, { status: 400 });
  }
  if (new Date(record.expiresAt) < new Date()) {
    return NextResponse.json({ error: "انتهت صلاحية رابط التحقق." }, { status: 400 });
  }

  const user = db.users.find((u) => u.id === record.userId);
  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });
  }

  user.emailVerified = true;
  record.used = true;

  await appendAuditLog(db, {
    action: "user.email_verified",
    targetId: user.id,
    targetEmail: user.email,
    details: `تم تأكيد البريد الإلكتروني لـ ${user.name}`
  });

  await writeDb(db);

  return NextResponse.json({
    ok: true,
    message: "تم تأكيد البريد الإلكتروني. انتظر موافقة المدير لتفعيل الحساب إن كان لا يزال بانتظار الموافقة."
  });
}
