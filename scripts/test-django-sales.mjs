#!/usr/bin/env node
/**
 * Smoke test for Django sales API (Phase 6) — reservations & invoices.
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
  return `TST${base}`.padEnd(17, "0").slice(0, 17);
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

  const vin = uniqueVin();
  const internal = `SAL-${Date.now().toString(36).toUpperCase()}`;
  r = await req("/api/vehicles/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      internal_number: internal,
      vin,
      plate_number: "TEST",
      manufacturer: "تويوتا",
      model: "كورولا",
      trim: "SE",
      year: 2021,
      exterior_color: "أبيض",
      interior_color: "رمادي",
      fuel_type: "بنزين",
      transmission: "أوتوماتيك",
      mileage: 10000,
      purchase_price: 15000000,
      sale_price: 18000000,
      minimum_sale_price: 17000000,
      maintenance_cost: 0,
      transportation_cost: 0,
      branch_name: "الفرع الرئيسي",
      supplier: "اختبار"
    })
  });
  if (r.status !== 201) throw new Error(`create vehicle failed: ${JSON.stringify(r.body)}`);
  const vehicleId = r.body.id;
  console.log("vehicle created:", vehicleId);

  r = await req("/api/customers/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: "عميل اختبار مبيعات",
      phone: `07${String(Date.now()).slice(-9)}`,
      email: `sale-test-${Date.now()}@example.com`,
      address: "بغداد",
      id_number: `ID${Date.now()}`,
      notes: ""
    })
  });
  if (r.status !== 201) throw new Error(`create customer failed: ${JSON.stringify(r.body)}`);
  const customerId = r.body.id;
  console.log("customer created:", customerId);

  const expires = new Date(Date.now() + 86400000 * 2).toISOString();
  r = await req("/api/sales/reservations/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      vehicle_id: vehicleId,
      customer_id: customerId,
      employee_name: "موظف اختبار",
      deposit: 500000,
      expires_at: expires
    })
  });
  if (r.status !== 201) throw new Error(`create reservation failed: ${JSON.stringify(r.body)}`);
  const reservationId = r.body.id;
  console.log("reservation created:", reservationId);

  r = await req(`/api/vehicles/${vehicleId}/`, { headers: auth });
  if (r.status !== 200 || r.body.status !== "reserved") {
    throw new Error(`vehicle should be reserved: ${JSON.stringify(r.body.status)}`);
  }
  console.log("vehicle status reserved: ok");

  r = await req("/api/sales/invoices/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      vehicle_id: vehicleId,
      customer_id: customerId,
      payment_type: "cash",
      total: 18000000,
      discount: 0,
      tax: 0,
      force_reserved_sale: true
    })
  });
  if (r.status !== 201) throw new Error(`sale without override should fail? got: ${JSON.stringify(r.body)}`);
  // Admin has override — should succeed
  console.log("sale invoice (reserved override): ok", r.body.document_number);

  r = await req(`/api/vehicles/${vehicleId}/`, { headers: auth });
  if (r.status !== 200 || r.body.status !== "sold") {
    throw new Error(`vehicle should be sold: ${JSON.stringify(r.body)}`);
  }
  console.log("vehicle status sold: ok");

  r = await req("/api/sales/invoices/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      vehicle_id: vehicleId,
      customer_id: customerId,
      payment_type: "cash",
      total: 18000000,
      discount: 0,
      tax: 0
    })
  });
  if (r.status === 201) throw new Error("double sale should be blocked");
  console.log("double sale blocked: ok", r.body.detail ?? r.body);

  r = await req("/api/sales/reservations/", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("list reservations failed");
  console.log("reservations list: ok count=", r.body.length);

  r = await req("/api/sales/invoices/", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("list invoices failed");
  console.log("invoices list: ok count=", r.body.length);

  console.log("\nPhase 6 Django sales tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
