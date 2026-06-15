import { NextResponse } from "next/server";
import { appendAuditLog, readDb, writeDb } from "@/lib/server/db";
import { djangoErrorMessage, djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "رمز التحقق مفقود." }, { status: 400 });
  }

  if (isDjangoAuthEnabled()) {
    const { status, data } = await djangoJson<{
      ok?: boolean;
      email_verified?: boolean;
      detail?: string;
    }>("/api/auth/verify-email/", {
      method: "POST",
      body: JSON.stringify({ token })
    });
    if (status !== 200 || !data.ok) {
      return NextResponse.json(
        { error: djangoErrorMessage(data, "فشل التحقق من البريد.") },
        { status: status >= 400 ? status : 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      message:
        "تم تأكيد البريد الإلكتروني. انتظر موافقة المدير لتفعيل الحساب إن كان لا يزال بانتظار الموافقة."
    });
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
