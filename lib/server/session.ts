import { cookies } from "next/headers";
import { isCloudflareTunnelHost, readEnvPublicBaseUrl, resolveOriginFromRequest } from "@/lib/runtime-config";
import { readDb, type DbUser } from "@/lib/server/db";

const SESSION_COOKIE = "br_session";
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;

export function sessionMaxAgeSeconds(rememberMe = false) {
  if (rememberMe) {
    return REMEMBER_DAYS * 24 * 60 * 60;
  }
  return SESSION_HOURS * 60 * 60;
}

export function sessionCookieHeader(token: string, request?: Request, rememberMe = false) {
  const forwardedProto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestHost = request?.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request?.headers.get("host") ?? "";
  const envUrl = readEnvPublicBaseUrl();
  const isSecure =
    forwardedProto === "https" ||
    isCloudflareTunnelHost(requestHost) ||
    (request ? resolveOriginFromRequest(request)?.startsWith("https://") : false) ||
    (typeof envUrl === "string" && envUrl.startsWith("https://"));
  const secure = isSecure ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds(rememberMe)}${secure}`;
}

export function parseSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)br_session=([^;]+)/);
  return match?.[1] ?? null;
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
  const token = parseSessionToken(request.headers.get("cookie"));
  return getUserBySessionToken(token);
}

export async function getUserFromCookies(): Promise<DbUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? null;
  return getUserBySessionToken(token);
}
