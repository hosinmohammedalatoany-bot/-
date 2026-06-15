#!/usr/bin/env node
/**
 * Smoke test for Django reports API (Phase 10).
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

  r = await req("/api/reports/", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body.reports)) {
    throw new Error(`catalog failed: ${JSON.stringify(r.body)}`);
  }
  console.log("catalog:", r.body.reports.length, "reports");

  const types = ["sales", "profit", "inventory", "sold", "installments", "customers", "branches", "employees"];
  for (const type of types) {
    r = await req(`/api/reports/data/?type=${type}`, { headers: auth });
    if (r.status !== 200) {
      throw new Error(`report ${type} failed: ${JSON.stringify(r.body)}`);
    }
    console.log(`${type}:`, r.body.row_count, "rows");
  }

  r = await req("/api/reports/export/?type=sales&export_format=csv", { headers: auth });
  if (r.status !== 200 || typeof r.body !== "string" || !r.body.includes(",")) {
    throw new Error(`csv export failed: status ${r.status}`);
  }
  console.log("csv export OK, bytes:", r.body.length);

  console.log("reports API smoke test OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
