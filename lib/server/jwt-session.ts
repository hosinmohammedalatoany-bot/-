import { djangoFetch, isDjangoAuthEnabled, mapDjangoRoleToClient } from "@/lib/server/django-api";
import { clearRememberPreferenceCookieHeader } from "@/lib/server/remember-cookie";
import type { DbUser, UserRole, UserStatus } from "@/lib/server/db";

export const JWT_ACCESS_COOKIE = "br_jwt_access";
export const JWT_REFRESH_COOKIE = "br_jwt_refresh";

export function jwtCookieHeaders(
  access: string,
  refresh: string,
  request?: Request,
  rememberMe = false
) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
  const forwardedProto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return [
    `${JWT_ACCESS_COOKIE}=${access}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
    `${JWT_REFRESH_COOKIE}=${refresh}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure}`
  ];
}

export function readJwtAccessFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)br_jwt_access=([^;]+)/);
  return match?.[1] ?? null;
}

export function readJwtRefreshFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)br_jwt_refresh=([^;]+)/);
  return match?.[1] ?? null;
}

/** Clear JWT session cookies (and legacy session cookie). */
export function clearAuthCookieHeaders(request?: Request): string[] {
  const forwardedProto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return [
    `${JWT_ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    `${JWT_REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    `br_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    clearRememberPreferenceCookieHeader(request)
  ];
}

export async function getDjangoUserFromAccessToken(
  accessToken: string | null
): Promise<DbUser | null> {
  if (!accessToken || !isDjangoAuthEnabled()) return null;
  try {
    const res = await djangoFetch("/api/auth/me/", { accessToken });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      user: {
        id: string;
        email: string;
        name: string;
        phone?: string;
        role: string;
        branch: string;
        status: string;
        permissions: string[];
        must_change_password?: boolean;
      };
    };
    const u = data.user;
    const statusMap: Record<string, UserStatus> = {
      active: "active",
      pending_approval: "pending-approval",
      disabled: "disabled",
      rejected: "rejected",
      suspended: "suspended"
    };
    return {
      id: u.id,
      email: u.email,
      passwordHash: "",
      name: u.name,
      phone: u.phone ?? "",
      role: mapDjangoRoleToClient(u.role) as UserRole,
      branch: u.branch,
      status: statusMap[u.status] ?? "active",
      emailVerified: true,
      permissions: u.permissions,
      failedAttempts: 0,
      createdAt: new Date().toISOString(),
      mustChangePassword: u.must_change_password ?? false
    };
  } catch {
    return null;
  }
}
