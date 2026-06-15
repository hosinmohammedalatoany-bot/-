import { isCloudflareTunnelHost, readEnvPublicBaseUrl, resolveOriginFromRequest } from "@/lib/runtime-config";
import { sessionMaxAgeSeconds } from "@/lib/server/session";

export const REMEMBER_COOKIE = "br_remember";

function cookieSecureSuffix(request?: Request): string {
  const forwardedProto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestHost = request?.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request?.headers.get("host") ?? "";
  const envUrl = readEnvPublicBaseUrl();
  const isSecure =
    forwardedProto === "https" ||
    isCloudflareTunnelHost(requestHost) ||
    (request ? resolveOriginFromRequest(request)?.startsWith("https://") : false) ||
    (typeof envUrl === "string" && envUrl.startsWith("https://"));
  return isSecure ? "; Secure" : "";
}

/** Non-HttpOnly flag so the client knows whether to cache profile in localStorage. */
export function rememberPreferenceCookieHeader(rememberMe: boolean, request?: Request): string {
  const secure = cookieSecureSuffix(request);
  if (!rememberMe) {
    return `${REMEMBER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  }
  const maxAge = sessionMaxAgeSeconds(true);
  return `${REMEMBER_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearRememberPreferenceCookieHeader(request?: Request): string {
  return rememberPreferenceCookieHeader(false, request);
}
