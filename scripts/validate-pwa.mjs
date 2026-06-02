#!/usr/bin/env node
/**
 * Validates PWA manifest and service worker assets exist.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const errors = [];

async function checkFile(rel) {
  try {
    await readFile(path.join(root, rel));
  } catch {
    errors.push(`Missing file: ${rel}`);
  }
}

await checkFile("public/sw.js");
await checkFile("app/manifest.ts");
await checkFile("public/brand/app-icon.svg");

const sw = await readFile(path.join(root, "public/sw.js"), "utf8");
if (!sw.includes("/offline")) {
  errors.push("Service worker should cache /offline fallback");
}

if (errors.length) {
  console.error("PWA validation failed:\n", errors.join("\n"));
  process.exit(1);
}

console.log("PWA validation OK");
