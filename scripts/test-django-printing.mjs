#!/usr/bin/env node
/**
 * Smoke test for Django printing API (Phase 7) — verify + print logs.
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
    { encoding: "utf8", env: { ...process.env, USE_SQLITE: "true", PYTHONDONTWRITEBYTECODE: "1" } }
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
  return `PRT${base}`.padEnd(17, "0").slice(0, 17);
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

  r = await req("/api/sales/invoices/", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("list invoices failed");
  let invoice = r.body.find((row) => row.document_number && row.status === "issued");
  let documentNumber = invoice?.document_number;

  if (!documentNumber) {
    const vin = uniqueVin();
    const internal = `PRT-${Date.now().toString(36).toUpperCase()}`;
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
        interior_color: "أسود",
        fuel_type: "بنزين",
        transmission: "أوتوماتيك",
        mileage: 5000,
        purchase_price: 20000000,
        sale_price: 23000000,
        minimum_sale_price: 22000000,
        maintenance_cost: 0,
        transportation_cost: 0,
        branch_name: "الفرع الرئيسي",
        supplier: "اختبار طباعة"
      })
    });
    if (r.status !== 201) throw new Error(`create vehicle failed: ${JSON.stringify(r.body)}`);
    const vehicleId = r.body.id;

    r = await req("/api/customers/", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: "عميل اختبار طباعة",
        phone: `07${String(Date.now()).slice(-9)}`,
        email: `print-test-${Date.now()}@example.com`,
        address: "بغداد",
        id_number: `ID${Date.now()}`,
        notes: ""
      })
    });
    if (r.status !== 201) throw new Error(`create customer failed: ${JSON.stringify(r.body)}`);
    const customerId = r.body.id;

    r = await req("/api/sales/invoices/", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        vehicle_id: vehicleId,
        customer_id: customerId,
        payment_type: "cash",
        total: 23000000,
        discount: 0,
        tax: 0
      })
    });
    if (r.status !== 201) throw new Error(`create invoice failed: ${JSON.stringify(r.body)}`);
    documentNumber = r.body.document_number;
    console.log("created invoice for print test:", documentNumber);
  } else {
    console.log("using existing invoice:", documentNumber);
  }

  r = await req(`/api/sales/invoices/verify/${encodeURIComponent(documentNumber)}/`);
  if (r.status !== 200) throw new Error(`public verify failed: ${JSON.stringify(r.body)}`);
  if (!r.body.valid) throw new Error(`invoice should be valid: ${JSON.stringify(r.body)}`);
  if (r.body.document_number !== documentNumber) {
    throw new Error("verify document_number mismatch");
  }
  console.log("public verify: ok");

  r = await req("/api/sales/print-logs/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      document_type: "invoice",
      document_number: documentNumber,
      branch_name: "الفرع الرئيسي"
    })
  });
  if (r.status !== 201) throw new Error(`create print log failed: ${JSON.stringify(r.body)}`);
  if (r.body.print_count < 1) throw new Error("print_count invalid");
  console.log("print log created: ok count=", r.body.print_count);

  r = await req("/api/sales/print-logs/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      document_type: "invoice",
      document_number: documentNumber,
      branch_name: "الفرع الرئيسي"
    })
  });
  if (r.status !== 201) throw new Error(`second print log failed: ${JSON.stringify(r.body)}`);
  if (r.body.print_count < 2) throw new Error("print_count should increment");
  console.log("print log increment: ok count=", r.body.print_count);

  r = await req("/api/sales/print-logs/?limit=10", { headers: auth });
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("list print logs failed");
  const found = r.body.some((row) => row.document_number === documentNumber);
  if (!found) throw new Error("print log not in list");
  console.log("print logs list: ok");

  console.log("\nPhase 7 Django printing tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
