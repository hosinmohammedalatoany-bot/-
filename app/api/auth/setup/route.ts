import { NextResponse } from "next/server";
import { appendAuditLog, createToken, hashPassword, isStrongPassword, readDb, rolePermissions, writeDb, type DbUser } from "@/lib/server/db";
import { defaultBranches } from "@/lib/server/auth-constants";

export async function GET() {
  const db = await readDb();
  return NextResponse.json({ setupCompleted: db.setupCompleted, userCount: db.users.length });
}

export async function POST(request: Request) {
  const db = await readDb();
  if (db.setupCompleted) {
    return NextResponse.json({ error: "تم إعداد النظام مسبقاً." }, { status: 400 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    branch?: string;
    phone?: string;
  };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim() ?? "";
  const branch = body.branch?.trim() || "الفرع الرئيسي";
  const phone = body.phone?.trim() ?? "";

  if (!email || !name) {
    return NextResponse.json({ error: "الاسم والبريد الإلكتروني مطلوبان." }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json(
      { error: "كلمة المرور ضعيفة. يجب أن تكون 8 أحرف على الأقل وتحتوي حرفاً كبيراً وصغيراً ورقماً." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const user: DbUser = {
    id: createToken().slice(0, 12),
    email,
    passwordHash: hashPassword(password),
    name,
    phone,
    role: "super-admin",
    branch,
    status: "active",
    emailVerified: true,
    permissions: rolePermissions["super-admin"],
    failedAttempts: 0,
    createdAt: now,
    approvedAt: now
  };

  db.users.push(user);
  db.setupCompleted = true;
  db.branches = db.branches?.length ? db.branches : [...defaultBranches];
  if (!db.branches.includes(branch)) {
    db.branches.unshift(branch);
  }

  await appendAuditLog(db, {
    action: "setup.completed",
    actorId: user.id,
    actorEmail: user.email,
    details: `إعداد المدير العام الأول: ${user.name}`
  });

  await writeDb(db);

  return NextResponse.json({ ok: true, message: "تم إنشاء المدير العام بنجاح." });
}
