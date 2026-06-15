/**
 * Edge-compatible signed session cookies (Web Crypto).
 * Middleware can verify expiry + integrity without reading the JSON database.
 */

const VERSION = "v1";

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    console.warn("[baraa-raed] SESSION_SECRET is not set; using insecure fallback.");
  }
  return "baraa-raed-dev-session-secret-change-me";
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(message: string, secret: string) {
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

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signSessionCookieValue(token: string, expiresAtMs: number) {
  const payload = `${VERSION}.${token}.${expiresAtMs}`;
  const signature = await hmacSha256Hex(payload, sessionSecret());
  return `${payload}.${signature}`;
}

export async function verifySessionCookieValue(
  value: string | null | undefined
): Promise<{ token: string; expiresAtMs: number } | null> {
  if (!value || !value.startsWith(`${VERSION}.`)) {
    return null;
  }
  const parts = value.split(".");
  if (parts.length !== 4) {
    return null;
  }
  const token = parts[1];
  const expiresAtMs = Number(parts[2]);
  const signature = parts[3];
  if (!token || !Number.isFinite(expiresAtMs) || !signature) {
    return null;
  }
  const payload = `${VERSION}.${token}.${expiresAtMs}`;
  const expected = await hmacSha256Hex(payload, sessionSecret());
  if (!timingSafeEqualHex(signature, expected)) {
    return null;
  }
  if (Date.now() > expiresAtMs) {
    return null;
  }
  return { token, expiresAtMs };
}
