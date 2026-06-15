import { cookies } from "next/headers";
import { isCloudflareTunnelHost, readEnvPublicBaseUrl, resolveOriginFromRequest } from "@/lib/runtime-config";
import { readDb, type DbUser } from "@/lib/server/db";
import { signSessionCookieValue, verifySessionCookieValue } from "@/lib/server/session-signature";

const SESSION_COOKIE = "br_session";
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;

export function sessionMaxAgeSeconds(rememberMe = false) {
  if (rememberMe) {
    return REMEMBER_DAYS * 24 * 60 * 60;
  }
  return SESSION_HOURS * 60 * 60;
}

export async function sessionCookieHeader(token: string, request?: Request, rememberMe = false) {
  const forwardedProto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestHost = request?.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request?.headers.get("host") ?? "";
  const envUrl = readEnvPublicBaseUrl();
  const isSecure =
    forwardedProto === "https" ||
    isCloudflareTunnelHost(requestHost) ||
    (request ? resolveOriginFromRequest(request)?.startsWith("https://") : false) ||
    (typeof envUrl === "string" && envUrl.startsWith("https://"));
  const secure = isSecure ? "; Secure" : "";
  const maxAge = sessionMaxAgeSeconds(rememberMe);
  const expiresAtMs = Date.now() + maxAge * 1000;
  const signed = await signSessionCookieValue(token, expiresAtMs);
  return `${SESSION_COOKIE}=${signed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function readSessionCookieRaw(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)br_session=([^;]+)/);
  return match?.[1] ?? null;
}

/** @deprecated Use resolveSessionToken */
export function parseSessionToken(cookieHeader: string | null): string | null {
  return readSessionCookieRaw(cookieHeader);
}

export async function resolveSessionToken(cookieHeader: string | null): Promise<string | null> {
  const raw = readSessionCookieRaw(cookieHeader);
  if (!raw) return null;
  const verified = await verifySessionCookieValue(raw);
  return verified?.token ?? null;
}

export async function getUserBySessionToken(token: string | null): Promise<DbUser | null> {
  if (!token) return null;
  const db = await readDb();
  const session = db.sessions.find((s) => s.token === token && new Date(s.expiresAt) > new Date());
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId);
  if (!user || user.status !== "active") return null;
  return user;
}

export async function getUserFromRequest(request: Request): Promise<DbUser | null> {
  const { getDjangoUserFromAccessToken, readJwtAccessFromCookie } = await import(
    "@/lib/server/jwt-session"
  );
  const { isDjangoAuthEnabled } = await import("@/lib/server/django-api");
  const cookieHeader = request.headers.get("cookie");
  if (isDjangoAuthEnabled()) {
    const jwtUser = await getDjangoUserFromAccessToken(readJwtAccessFromCookie(cookieHeader));
    if (jwtUser) return jwtUser;
  }
  const token = await resolveSessionToken(cookieHeader);
  return getUserBySessionToken(token);
}

export async function getUserFromCookies(): Promise<DbUser | null> {
  const { getDjangoUserFromAccessToken } = await import("@/lib/server/jwt-session");
  const { isDjangoAuthEnabled } = await import("@/lib/server/django-api");
  const jar = await cookies();
  if (isDjangoAuthEnabled()) {
    const access = jar.get("br_jwt_access")?.value ?? null;
    const jwtUser = await getDjangoUserFromAccessToken(access);
    if (jwtUser) return jwtUser;
  }
  const raw = jar.get(SESSION_COOKIE)?.value ?? null;
  const token = await verifySessionCookieValue(raw);
  return getUserBySessionToken(token?.token ?? null);
}
