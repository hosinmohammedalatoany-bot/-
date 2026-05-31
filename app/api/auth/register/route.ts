import { NextResponse } from "next/server";
import {
  appendAuditLog,
  createToken,
  hashPassword,
  readDb,
  writeDb,
  type DbUser,
  rolePermissions
} from "@/lib/server/db";
import { defaultBranches } from "@/lib/server/auth-constants";
import { registerSchema } from "@/lib/validation/register-schema";
import { sessionCookieHeader, sessionMaxAgeSeconds } from "@/lib/server/session";

export async function GET() {
  const db = await readDb();
  if (!db.setupCompleted) {
    return NextResponse.json({
      open: true,
      setupCompleted: false,
      firstSetup: true,
      message: "أنشئ أول حساب — سيصبح مدير النظام ويُفعَّل فوراً."
    });
  }
  return NextResponse.json({
    open: db.registrationOpen,
    setupCompleted: true,
    firstSetup: false
  });
}

export async function POST(request: Request) {
  const db = await readDb();

  if (db.setupCompleted && !db.registrationOpen) {
    return NextResponse.json({ error: "التسجيل مغلق حالياً. تواصل مع المدير العام." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "تحقق من الحقول." }, { status: 400 });
  }

  const data = parsed.data;
  const email = data.email.trim().toLowerCase();

  if (db.users.some((u) => u.email === email)) {
    return NextResponse.json({ error: "البريد الإلكتروني مستخدم مسبقاً." }, { status: 409 });
  }

  const branches = db.branches?.length ? db.branches : [...defaultBranches];
  const defaultBranch = branches[0] ?? "الفرع الرئيسي";
  const hasSuperAdmin = db.users.some((u) => u.role === "super-admin");
  const isFirstAccount = !db.setupCompleted || !hasSuperAdmin;
  const role = isFirstAccount ? "super-admin" : "sales";

  const userId = createToken().slice(0, 12);
  const now = new Date().toISOString();

  const user: DbUser = {
    id: userId,
    email,
    passwordHash: hashPassword(data.password),
    name: data.name.trim(),
    phone: data.phone.trim(),
    role,
    branch: defaultBranch,
    status: "active",
    emailVerified: true,
    permissions: rolePermissions[role],
    failedAttempts: 0,
    createdAt: now,
    approvedAt: now
  };

  db.users.push(user);

  if (isFirstAccount) {
    db.setupCompleted = true;
    db.branches = db.branches?.length ? db.branches : [...defaultBranches];
    if (!db.branches.includes(defaultBranch)) {
      db.branches.unshift(defaultBranch);
    }
  }

  const token = createToken();
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds() * 1000).toISOString();
  db.sessions = db.sessions.filter((s) => s.userId !== user.id || new Date(s.expiresAt) > new Date());
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: now,
    expiresAt
  });

  await appendAuditLog(db, {
    action: "user.register",
    targetId: userId,
    targetEmail: email,
    details: `تسجيل حساب جديد وتفعيل مباشر — ${user.name}`
  });

  await writeDb(db);

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    branch: user.branch,
    permissions: user.permissions.length ? user.permissions : rolePermissions[user.role]
  };

  const response = NextResponse.json({
    ok: true,
    message: "تم إنشاء الحساب بنجاح. جاري تحويلك إلى لوحة التحكم.",
    status: "active",
    user: sessionUser
  });
  response.headers.set("Set-Cookie", sessionCookieHeader(token, request));
  return response;
}
