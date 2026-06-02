#!/usr/bin/env node
/**
 * Smoke test for Django customers & leads API (Phase 5).
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

  r = await req("/api/customers/", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("customers list failed");
  console.log("customers list: ok count=", r.body.length);

  const phone = `07${String(Date.now()).slice(-9)}`;
  r = await req("/api/customers/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: "عميل اختبار",
      phone,
      email: "test@example.com",
      address: "بغداد",
      id_number: `ID${Date.now()}`,
      notes: "من سكربت الاختبار"
    })
  });
  if (r.status !== 201) throw new Error(`customer create failed: ${JSON.stringify(r.body)}`);
  const customerId = r.body.id;
  console.log("customer create: ok", customerId);

  r = await req(`/api/customers/${customerId}/`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ notes: "تم التحديث" })
  });
  if (r.status !== 200) throw new Error("customer patch failed");

  r = await req("/api/leads/", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("leads list failed");
  console.log("leads list: ok count=", r.body.length);

  r = await req("/api/leads/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: "عميل محتمل اختبار",
      phone: `08${String(Date.now()).slice(-9)}`,
      source: "WhatsApp",
      assigned_to: "فريق المبيعات",
      note: "مهتم بسيارة عائلية"
    })
  });
  if (r.status !== 201) throw new Error(`lead create failed: ${JSON.stringify(r.body)}`);
  const leadId = r.body.id;
  console.log("lead create: ok", leadId);

  r = await req(`/api/leads/${leadId}/status/`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ status: "contact" })
  });
  if (r.status !== 200) throw new Error(`lead status failed: ${JSON.stringify(r.body)}`);
  console.log("lead status: ok", r.body.status);

  r = await req(`/api/leads/${leadId}/notes/`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ body: "اتصال هاتفي — طلب معاينة" })
  });
  if (r.status !== 201) throw new Error(`lead note failed: ${JSON.stringify(r.body)}`);

  r = await req(`/api/leads/${leadId}/`, { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body.timeline)) {
    throw new Error("lead detail timeline failed");
  }
  console.log("lead detail timeline: ok notes=", r.body.timeline.length);

  r = await req(`/api/leads/${leadId}/`, { method: "DELETE", headers: auth });
  if (r.status !== 204 && r.status !== 200) throw new Error("lead delete failed");

  r = await req(`/api/customers/${customerId}/`, { method: "DELETE", headers: auth });
  if (r.status !== 204 && r.status !== 200) throw new Error("customer delete failed");

  console.log("Phase 5 customers/leads API: all checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
