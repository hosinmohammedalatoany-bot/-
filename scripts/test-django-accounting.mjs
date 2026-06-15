#!/usr/bin/env node
/**
 * Smoke test for Django accounting API (Phase 9).
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const API = process.env.API_BASE_URL || "http://127.0.0.1:8000";
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "TestPass1a";

function resolveAdminEmail() {
  if (process.env.TEST_ADMIN_EMAIL) return process.env.TEST_ADMIN_EMAIL;
  const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "backend");
  const out = execSync(
    `cd "${backendDir}" && python3 manage.py shell -c "from accounts.models import ShowroomUser; u=ShowroomUser.objects.filter(role='admin').first(); print(u.email if u else '', end='')"`,
    { encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } }
  );
  const email = out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("@"))
    .pop();
  if (!email) throw new Error("no admin user — run test:django first");
  return email;
}

async function req(path, options = {}) {
  const { headers: optionHeaders, ...rest } = options;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: { "Content-Type": "application/json", ...(optionHeaders || {}) }
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function main() {
  let r = await req("/api/health/");
  if (r.status !== 200) throw new Error(`health failed: ${r.status}`);

  const loginEmail = resolveAdminEmail();
  r = await req("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email: loginEmail, password: TEST_PASSWORD })
  });
  if (r.status !== 200) throw new Error(`login failed: ${JSON.stringify(r.body)}`);
  const auth = { Authorization: `Bearer ${r.body.access}` };

  r = await req("/api/accounting/summary/", { headers: auth });
  if (r.status !== 200) throw new Error(`summary failed: ${JSON.stringify(r.body)}`);
  console.log("revenue:", r.body.revenue, "expenses:", r.body.total_expenses);

  r = await req("/api/accounting/expenses/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      category: "اختبار محاسبة",
      amount: 50000,
      branch_name: "الفرع الرئيسي",
      description: "مصروف اختبار آلي",
      expense_type: "general"
    })
  });
  if (r.status !== 201) throw new Error(`expense create failed: ${JSON.stringify(r.body)}`);
  const expenseId = r.body.id;
  console.log("expense:", expenseId);

  const today = new Date().toISOString().slice(0, 10);
  r = await req("/api/accounting/daily-cash/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      branch_name: "الفرع الرئيسي",
      business_date: today,
      opening_balance: 100000,
      notes: "اختبار"
    })
  });
  if (r.status !== 201 && r.status !== 400) {
    throw new Error(`daily cash failed: ${JSON.stringify(r.body)}`);
  }
  if (r.status === 201) {
    const registerId = r.body.id;
    r = await req(`/api/accounting/daily-cash/${registerId}/transactions/`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        direction: "in",
        amount: 25000,
        category: "وارد اختبار",
        reference_label: "test"
      })
    });
    if (r.status !== 201) throw new Error(`cash tx failed: ${JSON.stringify(r.body)}`);
    console.log("cash transaction OK");
  } else {
    console.log("daily cash already exists for today — skipped tx test");
  }

  r = await req(`/api/accounting/expenses/${expenseId}/`, {
    method: "DELETE",
    headers: auth
  });
  if (r.status !== 204) throw new Error(`expense delete failed: ${JSON.stringify(r.body)}`);

  console.log("accounting API smoke test OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
