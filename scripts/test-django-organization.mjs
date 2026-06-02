#!/usr/bin/env node
/**
 * Smoke test for Django organization API (Phase 3).
 * Requires: npm run api:dev (or API on :8000)
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
  if (!email) throw new Error("no admin user in database — run test:django first or api setup");
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
  const email = `org-test-${Date.now()}@baraa-raed.local`;

  let r = await req("/api/health/");
  if (r.status !== 200) throw new Error(`health failed: ${r.status}`);

  r = await req("/api/auth/setup/status/");
  if (r.status !== 200) throw new Error("setup status failed");

  const needsSetup = !r.body.setup_completed;

  if (needsSetup) {
    r = await req("/api/auth/setup/", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: TEST_PASSWORD,
        name: "مدير الاختبار",
        branch: "الفرع الرئيسي"
      })
    });
    if (r.status !== 201) throw new Error(`setup failed: ${JSON.stringify(r.body)}`);
  }

  const loginEmail = needsSetup ? email : resolveAdminEmail();
  const loginPass = TEST_PASSWORD;

  r = await req("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email: loginEmail, password: loginPass })
  });
  if (r.status !== 200) throw new Error(`login failed: ${JSON.stringify(r.body)}`);
  const { access } = r.body;
  const auth = { Authorization: `Bearer ${access}` };

  r = await req("/api/organization/company/", { headers: auth });
  if (r.status !== 200) throw new Error(`company get failed: ${JSON.stringify(r.body)}`);
  if (!r.body.currency) throw new Error("company missing currency");
  console.log("company get: ok currency=", r.body.currency);

  r = await req("/api/organization/company/", {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ company_name: "براء رائد - اختبار", currency: "IQD" })
  });
  if (r.status !== 200) throw new Error(`company patch failed: ${JSON.stringify(r.body)}`);
  console.log("company patch: ok");

  r = await req("/api/organization/branches/", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("branches list failed");
  console.log("branches list: ok count=", r.body.length);

  const branchName = `فرع اختبار ${Date.now()}`;
  r = await req("/api/organization/branches/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ name: branchName, code: `T${Date.now().toString(36).slice(-4)}`, is_active: true })
  });
  if (r.status !== 201) throw new Error(`branch create failed: ${JSON.stringify(r.body)}`);
  const branchId = r.body.id;
  console.log("branch create: ok id=", branchId);

  r = await req(`/api/organization/branches/${branchId}/`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ phone: "07700000000" })
  });
  if (r.status !== 200) throw new Error(`branch patch failed: ${JSON.stringify(r.body)}`);
  console.log("branch patch: ok");

  r = await req(`/api/organization/branches/${branchId}/`, {
    method: "DELETE",
    headers: auth
  });
  if (r.status !== 204) throw new Error(`branch delete failed: ${r.status}`);
  console.log("branch delete: ok");

  console.log("django-organization: all checks passed");
}

main().catch((err) => {
  console.error("django-organization FAILED:", err.message);
  process.exit(1);
});
