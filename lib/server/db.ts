import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type UserRole = "super-admin" | "branch-manager" | "sales" | "accountant" | "inventory" | "read-only";

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  branch: string;
  permissions: string[];
  failedAttempts: number;
  lockedUntil?: string;
  createdAt: string;
}

export interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
}

export interface ServerDb {
  users: DbUser[];
  resetTokens: PasswordResetToken[];
  setupCompleted: boolean;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "baraa-raed-db.json");

const emptyDb: ServerDb = {
  users: [],
  resetTokens: [],
  setupCompleted: false
};

export async function readDb(): Promise<ServerDb> {
  try {
    const raw = await readFile(DB_PATH, "utf8");
    return JSON.parse(raw) as ServerDb;
  } catch {
    return { ...emptyDb };
  }
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
