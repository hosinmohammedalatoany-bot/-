import { NextResponse } from "next/server";
import { loginStatusMessagesAr } from "@/lib/server/auth-constants";
import {
  appendAuditLog,
  createToken,
  readDb,
  rolePermissions,
  verifyPassword,
  writeDb
} from "@/lib/server/db";
import { sessionCookieHeader, sessionMaxAgeSeconds } from "@/lib/server/session";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(request: Request) {
  const db = await readDb();
  if (!db.setupCompleted) {
    return NextResponse.json({ error: "يجب إعداد المدير الأول أولاً.", needsSetup: true }, { status: 403 });
  }

  const body = (await request.json()) as { email?: string; password?: string; rememberMe?: boolean };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const rememberMe = body.rememberMe === true;

  if (!email || !password) {
    return NextResponse.json({ error: "أدخل البريد الإلكتروني وكلمة المرور." }, { status: 400 });
  }

  const user = db.users.find((item) => item.email === email);
  if (!user) {
    await appendAuditLog(db, {
      action: "auth.login-failed",
      actorEmail: email,
      details: "محاولة دخول ببريد غير مسجل"
    });
    await writeDb(db);
    return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." }, { status: 401 });
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    return NextResponse.json({ error: "الحساب مقفل مؤقتاً بسبب محاولات فاشلة." }, { status: 423 });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= MAX_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
    }
    await appendAuditLog(db, {
      action: "auth.login-failed",
      actorId: user.id,
      actorEmail: user.email,
      details: `محاولة دخول فاشلة (${user.failedAttempts})`
    });
    await writeDb(db);
    return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." }, { status: 401 });
  }

  if (user.status !== "active") {
    const statusMessage =
      loginStatusMessagesAr[user.status as keyof typeof loginStatusMessagesAr] ??
      "لا يمكن تسجيل الدخول بهذا الحساب.";
    return NextResponse.json({ error: statusMessage, status: user.status }, { status: 403 });
  }

  user.failedAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date().toISOString();

  const token = createToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionMaxAgeSeconds(rememberMe) * 1000).toISOString();
  db.sessions = db.sessions.filter((s) => s.userId !== user.id || new Date(s.expiresAt) > now);
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: now.toISOString(),
    expiresAt
  });
  await appendAuditLog(db, {
    action: "auth.login",
    actorId: user.id,
    actorEmail: user.email,
    details: "تسجيل دخول ناجح"
  });

  await writeDb(db);

  const response = NextResponse.json({
    ok: true,
    mustChangePassword: user.mustChangePassword ?? false,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branch: user.branch,
      permissions: user.permissions.length ? user.permissions : rolePermissions[user.role]
    }
  });
  response.headers.set("Set-Cookie", sessionCookieHeader(token, request, rememberMe));
  return response;
}
