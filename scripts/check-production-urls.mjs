#!/usr/bin/env node
/**
 * Fails if production-facing source contains hardcoded localhost / LAN IPs or stale demo domains.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "data"]);
const ALLOW_FILES = new Set([
  "lib/runtime-config.ts",
  "lib/server/app-url.ts",
  "scripts/check-production-urls.mjs",
  "scripts/test-django-auth.mjs",
  "scripts/test-django-organization.mjs",
  "scripts/test-django-vehicles.mjs",
  "scripts/test-django-customers.mjs",
  "scripts/test-django-sales.mjs",
  "scripts/test-django-printing.mjs",
  "scripts/test-django-installments.mjs",
  "scripts/test-django-accounting.mjs",
  "scripts/test-django-reports.mjs",
  "scripts/test-django-ops.mjs",
  "scripts/test-django-public.mjs",
  "scripts/test-django-security.mjs",
  "scripts/test-django-workspace.mjs"
]);

const PATTERNS = [
  { re: /http:\/\/localhost(?::\d+)?/gi, label: "http://localhost" },
  { re: /https?:\/\/127\.0\.0\.1/gi, label: "127.0.0.1 URL" },
  { re: /https?:\/\/192\.168\.\d+\.\d+/gi, label: "192.168.x.x URL" },
  { re: /https:\/\/app\.baraa-raed\.com/gi, label: "hardcoded app.baraa-raed.com" }
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (/\.(tsx?|jsx?|mjs|css|html)$/.test(name) || name === "sw.js") {
      files.push(p);
    }
  }
  return files;
}

const rel = (p) => p.replace(ROOT, "").replace(/^\//, "");
const hits = [];

for (const file of walk(ROOT)) {
  const r = rel(file);
  if (ALLOW_FILES.has(r)) continue;
  const text = readFileSync(file, "utf8");
  for (const { re, label } of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) {
      hits.push({ file: r, label });
    }
  }
}

if (hits.length) {
  console.error("Production URL check failed:\n");
  for (const h of hits) {
    console.error(`  ${h.file}: ${h.label}`);
  }
  process.exit(1);
}

console.log("OK: no hardcoded localhost / LAN / demo app URLs in app source.");
