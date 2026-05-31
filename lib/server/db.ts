import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type UserRole = "super-admin" | "branch-manager" | "sales" | "accountant" | "inventory" | "read-only";

export type UserStatus = "pending-approval" | "active" | "disabled" | "rejected" | "suspended";

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: UserRole;
  branch: string;
  status: UserStatus;
  emailVerified: boolean;
  permissions: string[];
  failedAttempts: number;
  lockedUntil?: string;
  createdAt: string;
  termsAcceptedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
}

export interface DbSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface EmailVerificationToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: string;
  used: boolean;
}

export interface AdminNotification {
  id: string;
  type: "user-registration";
  userId: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  action: string;
  actorId?: string;
  actorEmail?: string;
  targetId?: string;
  targetEmail?: string;
  details: string;
}

export interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
}

export interface ServerDb {
  users: DbUser[];
  sessions: DbSession[];
  resetTokens: PasswordResetToken[];
  emailVerificationTokens: EmailVerificationToken[];
  auditLogs: AuditLogEntry[];
  adminNotifications: AdminNotification[];
  branches: string[];
  setupCompleted: boolean;
  registrationOpen: boolean;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "baraa-raed-db.json");

const emptyDb: ServerDb = {
  users: [],
  sessions: [],
  resetTokens: [],
  emailVerificationTokens: [],
  auditLogs: [],
  adminNotifications: [],
  branches: ["الفرع الرئيسي", "بغداد", "البصرة", "أربيل"],
  setupCompleted: false,
  registrationOpen: true
};

/** Factory-default server database (no users, setup required). */
export function getEmptyDb(): ServerDb {
  return {
    ...emptyDb,
    branches: [...emptyDb.branches]
  };
}

/** Wipes users, sessions, tokens, and audit data; returns app to first-time `/setup`. */
export async function resetServerDatabase() {
  await writeDb(getEmptyDb());
}

function normalizeDb(db: ServerDb): ServerDb {
  db.sessions = db.sessions ?? [];
  db.emailVerificationTokens = db.emailVerificationTokens ?? [];
  db.auditLogs = db.auditLogs ?? [];
  db.adminNotifications = db.adminNotifications ?? [];
  db.branches = db.branches?.length ? db.branches : [...emptyDb.branches];
  db.registrationOpen = db.registrationOpen ?? true;
  db.users = db.users.map((user) => ({
    ...user,
    phone: user.phone ?? "",
    status: user.status ?? (user.role === "super-admin" ? "active" : "active"),
    emailVerified: user.emailVerified ?? true,
    mustChangePassword: user.mustChangePassword ?? false
  }));
  return db;
}

export async function readDb(): Promise<ServerDb> {
  let db: ServerDb;
  try {
    const raw = await readFile(DB_PATH, "utf8");
    db = normalizeDb(JSON.parse(raw) as ServerDb);
  } catch {
    db = { ...emptyDb };
  }

  const { maybeBootstrapFromEnv } = await import("@/lib/server/bootstrap");
  const bootstrapped = await maybeBootstrapFromEnv(db);
  if (bootstrapped !== db) {
    await writeDb(bootstrapped);
    return bootstrapped;
  }
  return db;
}

export async function appendAuditLog(
  db: ServerDb,
  entry: Omit<AuditLogEntry, "id" | "at"> & { at?: string }
) {
  const log: AuditLogEntry = {
    id: createToken().slice(0, 16),
    at: entry.at ?? new Date().toISOString(),
    action: entry.action,
    actorId: entry.actorId,
    actorEmail: entry.actorEmail,
    targetId: entry.targetId,
    targetEmail: entry.targetEmail,
    details: entry.details
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  return log;
}

export async function writeDb(db: ServerDb) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }
  const attempt = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return attempt.length === expected.length && timingSafeEqual(attempt, expected);
}

export function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

export function createToken() {
  return randomBytes(32).toString("hex");
}

export const rolePermissions: Record<UserRole, string[]> = {
  "super-admin": ["*", "print.invoices", "print.contracts", "print.reports", "export.pdf", "export.excel"],
  "branch-manager": [
    "dashboard",
    "cars",
    "customers",
    "leads",
    "sales",
    "installments",
    "inventory",
    "reports",
    "print.invoices",
    "print.reports",
    "export.pdf",
    "export.excel"
  ],
  sales: ["dashboard", "cars", "customers", "leads", "sales", "reservations", "whatsapp"],
  accountant: ["dashboard", "accounting", "installments", "reports", "print.reports", "export.pdf", "export.excel"],
  inventory: ["dashboard", "cars", "inventory", "purchases", "maintenance"],
  "read-only": ["dashboard", "cars", "customers", "reports"]
};
