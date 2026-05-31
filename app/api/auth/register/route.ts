import { NextResponse } from "next/server";
import {
  appendAuditLog,
  createToken,
  hashPassword,
  readDb,
  writeDb,
  type DbUser
} from "@/lib/server/db";
import { registerableRoles, registerRoleLabelsAr } from "@/lib/server/auth-constants";
import { registerSchema } from "@/lib/validation/register-schema";
import { rolePermissions } from "@/lib/server/db";

export async function GET() {
  const db = await readDb();
  if (!db.setupCompleted) {
    return NextResponse.json(
      { open: false, setupCompleted: false, message: "يجب إعداد المدير العام أولاً." },
      { status: 403 }
    );
  }
  return NextResponse.json({
    open: db.registrationOpen,
    setupCompleted: true,
    branches: db.branches,
    roles: registerableRoles.map((role) => ({
      value: role,
      label: registerRoleLabelsAr[role]
    }))
  });
}

export async function POST(request: Request) {
  const db = await readDb();

  if (!db.setupCompleted) {
    return NextResponse.json({ error: "يجب إعداد المدير العام أولاً عبر صفحة الإعداد." }, { status: 403 });
  }

  if (!db.registrationOpen) {
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

  const userId = createToken().slice(0, 12);
  const verifyToken = createToken();
  const now = new Date().toISOString();

  const user: DbUser = {
    id: userId,
    email,
    passwordHash: hashPassword(data.password),
    name: data.name.trim(),
    phone: data.phone.trim(),
    role: data.role,
    branch: data.branch.trim(),
    status: "pending-approval",
    emailVerified: false,
    permissions: rolePermissions[data.role],
    failedAttempts: 0,
    createdAt: now,
    termsAcceptedAt: now
  };

  db.users.push(user);
  db.emailVerificationTokens.push({
    token: verifyToken,
    userId,
    email,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    used: false
  });

  const admins = db.users.filter((u) => u.role === "super-admin" && u.status === "active");
  for (const admin of admins) {
    db.adminNotifications.unshift({
      id: createToken().slice(0, 12),
      type: "user-registration",
      userId,
      message: `طلب حساب جديد: ${user.name} (${registerRoleLabelsAr[data.role]}) — ${user.branch}`,
      createdAt: now,
      read: false
    });
  }

  await appendAuditLog(db, {
    action: "user.register",
    targetId: userId,
    targetEmail: email,
    details: `تسجيل حساب جديد بانتظار الموافقة — ${user.name} — ${registerRoleLabelsAr[data.role]}`
  });

  await writeDb(db);

  const origin = new URL(request.url).origin;
  const verifyUrl = `${origin}/verify-email?token=${verifyToken}`;
  const exposeVerify = process.env.VERIFY_EMAIL_IN_RESPONSE === "true" || process.env.NODE_ENV !== "production";

  return NextResponse.json({
    ok: true,
    message:
      "تم إنشاء الحساب بنجاح. حسابك بانتظار موافقة المدير — لا يمكن تسجيل الدخول حتى يتم التفعيل.",
    status: "pending-approval",
    verifyUrl: exposeVerify ? verifyUrl : undefined,
    emailSent: false
  });
}
