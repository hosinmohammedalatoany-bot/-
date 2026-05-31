/**
 * Factory-reset server auth database (users, sessions, setup flag).
 * Run: npm run reset:system
 *
 * Browsers still hold br_session cookie, br_user in localStorage, and IndexedDB showroom data —
 * clear site data or use «تصفير البيانات المحلية» in النسخ الاحتياطي after logging in again.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "baraa-raed-db.json");

const emptyDb = {
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

await mkdir(DATA_DIR, { recursive: true });
await writeFile(DB_PATH, JSON.stringify(emptyDb, null, 2), "utf8");

console.log("تم تصفير قاعدة بيانات الخادم:", DB_PATH);
console.log("- لا يوجد مستخدمون أو جلسات");
console.log("- setupCompleted = false → افتح /setup لإنشاء مدير النظام");
console.log("");
console.log("على كل جهاز (هاتف/متصفح):");
console.log("- امسح بيانات الموقع أو سجّل الخروج");
console.log("- أو من لوحة التحكم: النسخ الاحتياطي → تصفير البيانات المحلية");
