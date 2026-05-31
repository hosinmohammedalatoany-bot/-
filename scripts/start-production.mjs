#!/usr/bin/env node
/**
 * Production server for `output: "standalone"` — copies static assets then runs server.js.
 * Avoids broken `next start` + stale chunk mismatch (client-side Application error).
 */
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");

if (!existsSync(join(standalone, "server.js"))) {
  console.error("Missing .next/standalone/server.js — run: npm run build");
  process.exit(1);
}

cpSync(join(root, "public"), join(standalone, "public"), { recursive: true, force: true });
cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), {
  recursive: true,
  force: true
});

const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = process.env.PORT ?? "3000";

const child = spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: hostname, PORT: port, NODE_ENV: "production" }
});

child.on("exit", (code) => process.exit(code ?? 0));
