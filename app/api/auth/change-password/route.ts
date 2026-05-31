import { NextResponse } from "next/server";
import {
  appendAuditLog,
  hashPassword,
  isStrongPassword,
  readDb,
  verifyPassword,
  writeDb
} from "@/lib/server/db";
import { getUserFromRequest, parseSessionToken } from "@/lib/server/session";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة، يرجى تسجيل الدخول من جديد." }, { status: 401 });
  }

  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    logoutOtherDevices?: boolean;
  };

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";
  const confirmPassword = body.confirmPassword ?? "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "أكمل جميع الحقول." }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "كلمتا المرور الجديدتان غير متطابقتين." }, { status: 400 });
  }

  if (!isStrongPassword(newPassword)) {
    return NextResponse.json(
      {
        error:
          "كلمة المرور ضعيفة. يجب أن تكون 8 أحرف على الأقل وتحتوي حرفاً كبيراً وصغيراً ورقماً."
      },
      { status: 400 }
    );
  }

  const db = await readDb();
  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) {
    return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });
  }

  if (!verifyPassword(currentPassword, dbUser.passwordHash)) {
    return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة." }, { status: 401 });
  }

  if (verifyPassword(newPassword, dbUser.passwordHash)) {
    return NextResponse.json(
      { error: "لا يمكن استخدام نفس كلمة المرور السابقة." },
      { status: 400 }
    );
  }

  dbUser.passwordHash = hashPassword(newPassword);
  dbUser.mustChangePassword = false;
  dbUser.failedAttempts = 0;
  dbUser.lockedUntil = undefined;

  const currentToken = parseSessionToken(request.headers.get("cookie"));
  const logoutOthers = body.logoutOtherDevices !== false;

  if (logoutOthers) {
    db.sessions = db.sessions.filter(
      (s) => s.userId !== dbUser.id || (currentToken && s.token === currentToken)
    );
  }

  await appendAuditLog(db, {
    action: "user.password-change",
    actorId: dbUser.id,
    actorEmail: dbUser.email,
    details: logoutOthers ? "تغيير كلمة المرور وإنهاء الجلسات الأخرى" : "تغيير كلمة المرور"
  });

  await writeDb(db);

  return NextResponse.json({
    ok: true,
    message: "تم تغيير كلمة المرور بنجاح."
  });
}
