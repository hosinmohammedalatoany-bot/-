#!/usr/bin/env node
/**
 * Smoke test for audit logs, sessions, invoice revisions (Phase 11).
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
  const email = resolveAdminEmail();
  let r = await req("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password: TEST_PASSWORD })
  });
  if (r.status !== 200) {
    throw new Error(`login failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
  const access = r.body.access;
  const auth = { Authorization: `Bearer ${access}` };
  console.log("login: ok");

  r = await req("/api/auth/sessions/", { headers: auth });
  if (r.status !== 200) throw new Error(`sessions failed: ${r.status}`);
  console.log("sessions:", (r.body.sessions || []).length);

  r = await req("/api/auth/audit-logs/?limit=20", { headers: auth });
  if (r.status !== 200) throw new Error(`audit-logs failed: ${r.status}`);
  console.log("audit logs:", (r.body.logs || []).length);

  r = await req("/api/sales/invoices/", { headers: auth });
  if (r.status !== 200) throw new Error(`invoices list failed: ${r.status}`);
  const invoices = r.body;
  const first = Array.isArray(invoices) ? invoices[0] : null;
  if (first?.id) {
    r = await req(`/api/sales/invoices/${first.id}/revisions/`, { headers: auth });
    if (r.status !== 200) throw new Error(`revisions failed: ${r.status}`);
    console.log(
      "invoice revisions:",
      first.document_number,
      (r.body.revisions || []).length
    );
  } else {
    console.log("invoice revisions: skipped (no invoices)");
  }

  r = await req("/api/auth/logout-all/", { method: "POST", headers: auth });
  if (r.status !== 200) throw new Error(`logout-all failed: ${r.status}`);
  console.log("logout-all: ok");

  console.log("security API smoke test OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
