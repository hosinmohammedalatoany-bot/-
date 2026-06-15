/**
 * Session cookie signing smoke test (Node Web Crypto).
 */
import { webcrypto } from "node:crypto";

const crypto = webcrypto;
const VERSION = "v1";
const secret = "test-secret";

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(sig);
}

async function sign(token, expiresAtMs) {
  const payload = `${VERSION}.${token}.${expiresAtMs}`;
  return `${payload}.${await hmac(payload)}`;
}

async function verify(value) {
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return false;
  const payload = `${parts[0]}.${parts[1]}.${parts[2]}`;
  return (await hmac(payload)) === parts[3] && Date.now() <= Number(parts[2]);
}

const token = "a".repeat(64);
const exp = Date.now() + 60_000;
const signed = await sign(token, exp);

if (!(await verify(signed))) {
  throw new Error("valid signed cookie should verify");
}
if (await verify(signed.replace("a", "b"))) {
  throw new Error("tampered cookie should not verify");
}

console.log("session-signature: all checks passed");
