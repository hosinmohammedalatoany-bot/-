import { NextResponse } from "next/server";
import {
  appendAuditLog,
  hashPassword,
  isStrongPassword,
  readDb,
  verifyPassword,
  writeDb
} from "@/lib/server/db";
import { djangoErrorMessage, djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";

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

  if (isDjangoAuthEnabled()) {
    const { status, data } = await djangoJson<{ ok?: boolean; message?: string; detail?: string }>(
      "/api/auth/reset-password/",
      {
        method: "POST",
        body: JSON.stringify({ token, password })
      }
    );
    if (status !== 200 || !data.ok) {
      return NextResponse.json(
        { error: djangoErrorMessage(data, "فشل إعادة تعيين كلمة المرور.") },
        { status: status >= 400 ? status : 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      message: data.message ?? "تم تغيير كلمة المرور بنجاح، يرجى تسجيل الدخول."
    });
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

  if (verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "لا يمكن استخدام نفس كلمة المرور السابقة." },
      { status: 400 }
    );
  }

  user.passwordHash = hashPassword(password);
  user.mustChangePassword = false;
  user.failedAttempts = 0;
  user.lockedUntil = undefined;
  reset.used = true;
  db.sessions = db.sessions.filter((s) => s.userId !== user.id);

  await appendAuditLog(db, {
    action: "user.password-reset",
    actorId: user.id,
    actorEmail: user.email,
    details: "إعادة تعيين كلمة المرور عبر رابط الاستعادة"
  });

  await writeDb(db);
  return NextResponse.json({
    ok: true,
    message: "تم تغيير كلمة المرور بنجاح، يرجى تسجيل الدخول."
  });
}
