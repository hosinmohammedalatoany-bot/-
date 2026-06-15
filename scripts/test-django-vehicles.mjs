#!/usr/bin/env node
/**
 * Smoke test for Django vehicles API (Phase 4).
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

function uniqueVin() {
  const base = Date.now().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  return `TEST${base}`.padEnd(17, "0").slice(0, 17);
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

  r = await req("/api/vehicles/", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("vehicles list failed");
  console.log("vehicles list: ok count=", r.body.length);

  const vin = uniqueVin();
  const internal = `INT-${Date.now().toString(36).toUpperCase()}`;
  r = await req("/api/vehicles/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      internal_number: internal,
      vin,
      plate_number: "بغداد 123",
      manufacturer: "تويوتا",
      model: "كامري",
      trim: "GLE",
      year: 2022,
      exterior_color: "أبيض",
      interior_color: "بيج",
      fuel_type: "بنزين",
      transmission: "أوتوماتيك",
      mileage: 45000,
      purchase_price: 25000000,
      sale_price: 28000000,
      minimum_sale_price: 27000000,
      maintenance_cost: 0,
      transportation_cost: 0,
      branch: "الفرع الرئيسي",
      supplier: "مورد اختبار",
      status: "available"
    })
  });
  if (r.status !== 201) throw new Error(`vehicle create failed: ${JSON.stringify(r.body)}`);
  const vehicleId = r.body.id;
  if (!vehicleId || r.body.vin !== vin) throw new Error("vehicle create response invalid");
  console.log("vehicle create: ok id=", vehicleId);

  r = await req(`/api/vehicles/${vehicleId}/`, { headers: auth });
  if (r.status !== 200) throw new Error("vehicle detail failed");
  console.log("vehicle detail: ok");

  r = await req(`/api/vehicles/${vehicleId}/status/`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ status: "reserved" })
  });
  if (r.status !== 200 || r.body.status !== "reserved") {
    throw new Error(`status change failed: ${JSON.stringify(r.body)}`);
  }
  console.log("vehicle status: ok reserved");

  r = await req("/api/vehicles/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      internal_number: `${internal}-DUP`,
      vin,
      manufacturer: "هوندا",
      model: "أكورد",
      year: 2021,
      branch: "الفرع الرئيسي"
    })
  });
  if (r.status !== 400) throw new Error("duplicate VIN should fail");
  console.log("duplicate VIN blocked: ok");

  r = await req(`/api/vehicles/verify/${vehicleId}/`);
  if (r.status !== 200) throw new Error(`public verify failed: ${JSON.stringify(r.body)}`);
  if (r.body.status !== "reserved") throw new Error("public verify wrong status");
  console.log("public verify: ok");

  r = await req(`/api/vehicles/${vehicleId}/`, { method: "DELETE", headers: auth });
  if (r.status !== 200 && r.status !== 204) throw new Error(`archive failed: ${r.status}`);
  console.log("vehicle archive: ok");

  r = await req("/api/vehicles/?archived=1", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("archived list failed");
  const found = r.body.some((v) => v.id === vehicleId);
  if (!found) throw new Error("archived vehicle not in list");
  console.log("archived list: ok");

  console.log("django-vehicles: all checks passed");
}

main().catch((err) => {
  console.error("django-vehicles FAILED:", err.message);
  process.exit(1);
});
