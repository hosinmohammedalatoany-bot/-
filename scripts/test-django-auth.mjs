#!/usr/bin/env node
/**
 * Smoke test for Django JWT auth API (Phase 2).
 * Requires: npm run api:dev (or API on :8000)
 */
const API = process.env.API_BASE_URL || "http://127.0.0.1:8000";

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
  const email = `test-${Date.now()}@baraa-raed.local`;
  const password = "TestPass1a";

  let r = await req("/api/health/");
  if (r.status !== 200) throw new Error(`health failed: ${r.status}`);
  console.log("health: ok");

  r = await req("/api/auth/setup/status/");
  if (r.status !== 200) throw new Error("setup status failed");
  const needsSetup = !r.body.setup_completed;
  console.log("setup_completed:", r.body.setup_completed);

  if (needsSetup) {
    r = await req("/api/auth/setup/", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        name: "مدير الاختبار",
        branch: "الفرع الرئيسي"
      })
    });
    if (r.status !== 201) throw new Error(`setup failed: ${JSON.stringify(r.body)}`);
    console.log("setup admin: ok");
  } else {
    r = await req("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (r.status !== 200) {
      console.log("login with new user skipped (setup already done)");
    }
  }

  const loginEmail = needsSetup ? email : email;
  const loginPass = password;

  if (needsSetup) {
    r = await req("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email: loginEmail, password: loginPass })
    });
    if (r.status !== 200) throw new Error(`login failed: ${JSON.stringify(r.body)}`);
    const { access, refresh, user } = r.body;
    if (!access || !refresh) throw new Error("missing tokens");
    console.log("login: ok role=", user.role);

    r = await req("/api/auth/me/", {
      headers: { Authorization: `Bearer ${access}` }
    });
    if (r.status !== 200) throw new Error("me failed");
    console.log("me: ok");

    r = await req("/api/auth/permissions/check/", {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
      body: JSON.stringify({ module: "cars" })
    });
    if (r.status !== 200 || r.body.allowed !== true) throw new Error("perm check failed");
    console.log("permissions check: ok");

    r = await req("/api/auth/logout/", {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
      body: JSON.stringify({ refresh })
    });
    if (r.status !== 200) throw new Error("logout failed");
    console.log("logout: ok");
  }

  console.log("django-auth: all checks passed");
}

main().catch((err) => {
  console.error("django-auth FAILED:", err.message);
  process.exit(1);
});
