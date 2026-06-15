#!/usr/bin/env node
/**
 * Smoke test for workspace dashboard, search, notifications, documents, filters (Phase 15).
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

  r = await req("/api/workspace/dashboard/", { headers: auth });
  if (r.status !== 200) throw new Error(`dashboard failed: ${r.status}`);
  console.log(
    "dashboard:",
    "available",
    r.body.available_vehicles,
    "customers",
    r.body.customer_count
  );

  r = await req("/api/workspace/search/?q=test&limit=5", { headers: auth });
  if (r.status !== 200) throw new Error(`search failed: ${r.status}`);
  console.log("search results:", (r.body.results || []).length);

  r = await req("/api/workspace/notifications/?limit=10", { headers: auth });
  if (r.status !== 200) throw new Error(`notifications failed: ${r.status}`);
  console.log("notifications:", (r.body.items || []).length, "unread", r.body.unread_count);

  r = await req("/api/workspace/documents/?limit=10", { headers: auth });
  if (r.status !== 200) throw new Error(`documents failed: ${r.status}`);
  console.log("documents:", (r.body.documents || []).length);

  r = await req("/api/workspace/saved-filters/", { headers: auth });
  if (r.status !== 200) throw new Error(`saved-filters list failed: ${r.status}`);

  r = await req("/api/workspace/saved-filters/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      module_key: "cars",
      name: "smoke-filter",
      query: { status: "available" },
      is_default: false
    })
  });
  if (r.status !== 201 && r.status !== 200) {
    throw new Error(`saved-filter create failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
  const filterId = r.body.id;
  console.log("saved filter:", filterId);

  r = await req(`/api/workspace/saved-filters/${filterId}/`, {
    method: "DELETE",
    headers: auth
  });
  if (r.status !== 204) throw new Error(`saved-filter delete failed: ${r.status}`);

  r = await req("/api/premium/capabilities/", { headers: auth });
  if (r.status !== 200) throw new Error(`premium failed: ${r.status}`);
  console.log("premium capabilities:", (r.body.capabilities || []).length);

  console.log("workspace API smoke test OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
