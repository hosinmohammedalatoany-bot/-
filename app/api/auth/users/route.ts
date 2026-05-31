import { NextResponse } from "next/server";
import { appendAuditLog, readDb, rolePermissions, writeDb } from "@/lib/server/db";
import { getUserFromRequest } from "@/lib/server/session";
import { registerRoleLabelsAr, userStatusLabelsAr } from "@/lib/server/auth-constants";
import type { UserStatus } from "@/lib/server/db";

function requireSuperAdmin(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user || user.role !== "super-admin") {
    return NextResponse.json({ error: "صلاحية المدير العام مطلوبة." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const actor = await getUserFromRequest(request);
  const denied = requireSuperAdmin(actor);
  if (denied) return denied;

  const db = await readDb();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as UserStatus | null;

  let users = db.users.filter((u) => u.role !== "super-admin");
  if (status) {
    users = users.filter((u) => u.status === status);
  }

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      roleLabel: registerRoleLabelsAr[u.role as keyof typeof registerRoleLabelsAr] ?? u.role,
      branch: u.branch,
      status: u.status,
      statusLabel: userStatusLabelsAr[u.status],
      emailVerified: u.emailVerified,
      createdAt: u.createdAt
    })),
    notifications: db.adminNotifications.filter((n) => !n.read).slice(0, 20)
  });
}

export async function PATCH(request: Request) {
  const actor = await getUserFromRequest(request);
  const denied = requireSuperAdmin(actor);
  if (denied) return denied;

  const body = (await request.json()) as {
    userId?: string;
    status?: UserStatus;
    reason?: string;
  };

  if (!body.userId || !body.status) {
    return NextResponse.json({ error: "معرّف المستخدم والحالة مطلوبان." }, { status: 400 });
  }

  const allowed: UserStatus[] = ["active", "rejected", "disabled", "suspended", "pending-approval"];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: "حالة غير مدعومة." }, { status: 400 });
  }

  const db = await readDb();
  const user = db.users.find((u) => u.id === body.userId);
  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });
  }
  if (user.role === "super-admin") {
    return NextResponse.json({ error: "لا يمكن تعديل حالة المدير العام بهذه الواجهة." }, { status: 403 });
  }

  const previous = user.status;
  user.status = body.status;
  if (body.status === "active") {
    user.approvedAt = new Date().toISOString();
    user.approvedBy = actor!.id;
    user.permissions = rolePermissions[user.role];
  }

  db.adminNotifications = db.adminNotifications.map((n) =>
    n.userId === user.id ? { ...n, read: true } : n
  );

  await appendAuditLog(db, {
    action: "user.status_change",
    actorId: actor!.id,
    actorEmail: actor!.email,
    targetId: user.id,
    targetEmail: user.email,
    details: `تغيير الحالة من ${previous} إلى ${body.status}${body.reason ? ` — ${body.reason}` : ""}`
  });

  await writeDb(db);

  const messages: Record<UserStatus, string> = {
    active: "تم تفعيل الحساب. يمكن للمستخدم تسجيل الدخول الآن.",
    rejected: "تم رفض الحساب.",
    disabled: "تم تعطيل الحساب.",
    suspended: "تم إيقاف الحساب مؤقتاً.",
    "pending-approval": "تم إرجاع الحساب لانتظار الموافقة."
  };

  return NextResponse.json({
    ok: true,
    message: messages[body.status],
    user: { id: user.id, status: user.status }
  });
}
