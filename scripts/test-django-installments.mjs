#!/usr/bin/env node
/**
 * Smoke test for Django installments API (Phase 8).
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
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function uniqueVin() {
  const n = String(Date.now()).padStart(12, "0");
  return `TST${n}`.slice(0, 17);
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
  const internal = `INST-${Date.now().toString(36).toUpperCase()}`;
  r = await req("/api/vehicles/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      internal_number: internal,
      vin,
      plate_number: "TEST",
      manufacturer: "هيونداي",
      model: "إلنترا",
      trim: "GLS",
      year: 2022,
      exterior_color: "أسود",
      interior_color: "رمادي",
      fuel_type: "بنزين",
      transmission: "أوتوماتيك",
      mileage: 5000,
      purchase_price: 20000000,
      sale_price: 24000000,
      minimum_sale_price: 23000000,
      maintenance_cost: 0,
      transportation_cost: 0,
      branch_name: "الفرع الرئيسي",
      supplier: "اختبار"
    })
  });
  if (r.status !== 201) throw new Error(`create vehicle failed: ${JSON.stringify(r.body)}`);
  const vehicleId = r.body.id;

  r = await req("/api/customers/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: "عميل اختبار تقسيط",
      phone: `07${String(Date.now()).slice(-9)}`,
      email: `inst-${Date.now()}@example.com`,
      address: "بغداد",
      id_number: `ID${Date.now()}`,
      notes: ""
    })
  });
  if (r.status !== 201) throw new Error(`create customer failed: ${JSON.stringify(r.body)}`);
  const customerId = r.body.id;

  const startDate = new Date().toISOString().slice(0, 10);
  r = await req("/api/installments/contracts/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      customer_id: customerId,
      vehicle_id: vehicleId,
      total_amount: 24000000,
      down_payment: 4000000,
      installment_count: 4,
      start_date: startDate,
      interval_days: 30
    })
  });
  if (r.status !== 201) throw new Error(`create contract failed: ${JSON.stringify(r.body)}`);
  const schedule = r.body.schedule;
  if (!Array.isArray(schedule) || schedule.length !== 4) {
    throw new Error(`expected 4 schedule entries, got ${schedule?.length}`);
  }
  const entryId = schedule[0].id;
  console.log("contract:", r.body.contract.contract_number, "entries:", schedule.length);

  r = await req("/api/installments/schedule/", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) {
    throw new Error(`list schedule failed: ${JSON.stringify(r.body)}`);
  }

  const payAmount = Math.min(Number(schedule[0].amount) - Number(schedule[0].paid_amount), 500000);
  r = await req("/api/installments/payments/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      schedule_entry_id: entryId,
      amount: payAmount,
      receipt_reference: "TEST-RCP"
    })
  });
  if (r.status !== 201) throw new Error(`record payment failed: ${JSON.stringify(r.body)}`);
  const paymentId = r.body.payment.id;
  console.log("payment recorded:", paymentId);

  r = await req(`/api/installments/payments/${paymentId}/`, {
    method: "DELETE",
    headers: auth
  });
  if (r.status !== 204) throw new Error(`delete payment failed: ${r.status} ${JSON.stringify(r.body)}`);

  r = await req("/api/installments/contracts/", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) {
    throw new Error(`list contracts failed: ${JSON.stringify(r.body)}`);
  }

  console.log("installments API smoke test OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
