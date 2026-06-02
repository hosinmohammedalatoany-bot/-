#!/usr/bin/env node
/**
 * Smoke test for public showroom API (Phase 14).
 */
const API = process.env.API_BASE_URL || "http://127.0.0.1:8000";

async function req(path) {
  const res = await fetch(`${API}${path}`);
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
  let r = await req("/api/organization/public/company/");
  if (r.status !== 200) throw new Error(`company public failed: ${r.status}`);
  console.log("company:", r.body.company_name, "phone:", r.body.phone || "(none)");

  r = await req("/api/vehicles/public/");
  if (r.status !== 200) throw new Error(`catalog failed: ${r.status}`);
  const vehicles = r.body.vehicles || [];
  console.log("catalog count:", r.body.count, "items:", vehicles.length);
  if (vehicles.length > 0) {
    const id = vehicles[0].id;
    if (vehicles[0].purchase_price !== undefined) {
      throw new Error("catalog must not expose purchase_price");
    }
    r = await req(`/api/vehicles/public/${id}/`);
    if (r.status !== 200) throw new Error(`detail failed: ${r.status}`);
    if (r.body.purchase_price !== undefined || r.body.maintenance_cost !== undefined) {
      throw new Error("detail must not expose internal costs");
    }
    console.log("detail:", r.body.manufacturer, r.body.model, "images:", (r.body.images || []).length);
  } else {
    console.log("no available vehicles — skip detail test");
  }

  r = await req("/api/vehicles/public/?q=zzz_no_match_xyz");
  if (r.status !== 200) throw new Error(`catalog search failed: ${r.status}`);
  console.log("search empty ok, count:", r.body.count);

  console.log("public showroom API smoke test OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
