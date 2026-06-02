#!/usr/bin/env node
/**
 * Smoke test for backups, health, error logs, sync logs (Phase 13).
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

  r = await req("/api/ops/health/", { headers: auth });
  if (r.status !== 200) throw new Error(`health failed: ${r.status}`);
  console.log("health:", r.body.status, "db:", r.body.database?.ok);

  r = await req("/api/ops/backups/", { headers: auth });
  if (r.status !== 200) throw new Error(`backups list failed: ${r.status}`);
  console.log("backups before:", (r.body.backups || []).length);

  r = await req("/api/ops/backups/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ kind: "manual" })
  });
  if (r.status !== 201 && r.status !== 200) {
    throw new Error(`backup create failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
  const backupId = r.body.id;
  console.log("backup created:", backupId, r.body.status, r.body.file_name);

  r = await req(`/api/ops/backups/${backupId}/download/`, { headers: auth });
  if (r.status !== 200) throw new Error(`backup download failed: ${r.status}`);
  console.log("backup download: ok, bytes ~", typeof r.body === "string" ? r.body.length : 0);

  r = await req("/api/ops/error-logs/?limit=5", { headers: auth });
  if (r.status !== 200) throw new Error(`error-logs failed: ${r.status}`);
  console.log("error logs:", (r.body.logs || []).length);

  r = await req("/api/ops/sync-logs/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      device_id: "smoke-test-device",
      status: "success",
      accepted: 2,
      duplicates: 1,
      failed: 0,
      remaining: 0,
      message: "ops smoke test"
    })
  });
  if (r.status !== 201) throw new Error(`sync-log create failed: ${r.status}`);
  console.log("sync log:", r.body.id);

  r = await req("/api/ops/sync-logs/?limit=5", { headers: auth });
  if (r.status !== 200) throw new Error(`sync-logs list failed: ${r.status}`);
  console.log("sync logs:", (r.body.logs || []).length);

  console.log("ops API smoke test OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
