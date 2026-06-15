import {
  appendAuditLog,
  createToken,
  hashPassword,
  isStrongPassword,
  rolePermissions,
  type DbUser,
  type ServerDb
} from "@/lib/server/db";
import { defaultBranches } from "@/lib/server/auth-constants";

/**
 * On first boot, optionally seed super-admin from environment (no hardcoded credentials in code).
 */
export async function maybeBootstrapFromEnv(db: ServerDb): Promise<ServerDb> {
  if (db.setupCompleted || db.users.length > 0) {
    return db;
  }

  const name = process.env.DEFAULT_ADMIN_NAME?.trim();
  const email = process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    return db;
  }

  if (!isStrongPassword(password)) {
    console.warn(
      "[baraa-raed] DEFAULT_ADMIN_PASSWORD does not meet strength rules; env bootstrap skipped."
    );
    return db;
  }

  const now = new Date().toISOString();
  const branch = process.env.DEFAULT_ADMIN_BRANCH?.trim() || "الفرع الرئيسي";

  const user: DbUser = {
    id: createToken().slice(0, 12),
    email,
    passwordHash: hashPassword(password),
    name,
    phone: process.env.DEFAULT_ADMIN_PHONE?.trim() ?? "",
    role: "super-admin",
    branch,
    status: "active",
    emailVerified: true,
    permissions: rolePermissions["super-admin"],
    failedAttempts: 0,
    createdAt: now,
    approvedAt: now,
    mustChangePassword: true
  };

  const next: ServerDb = {
    ...db,
    users: [user],
    setupCompleted: true,
    branches: db.branches?.length ? [...db.branches] : [...defaultBranches]
  };
  if (!next.branches.includes(branch)) {
    next.branches = [branch, ...next.branches];
  }

  await appendAuditLog(next, {
    action: "setup.env-bootstrap",
    actorId: user.id,
    actorEmail: user.email,
    details: "إنشاء المدير العام من متغيرات البيئة (يجب تغيير كلمة المرور عند أول دخول)"
  });

  return next;
}
