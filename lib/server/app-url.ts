/**
 * Resolves the public app origin for links (verify email, reset password).
 * Prefer NEXT_PUBLIC_APP_URL in production; never hardcode localhost.
 */
export function getPublicAppOrigin(request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost.split(",")[0]?.trim()}`;
    }

    const host = request.headers.get("host");
    if (host && !host.startsWith("0.0.0.0")) {
      const proto =
        request.headers.get("x-forwarded-proto") ??
        (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`;
    }

    try {
      const origin = new URL(request.url).origin;
      if (!origin.includes("0.0.0.0")) {
        return origin;
      }
    } catch {
      /* fall through */
    }
  }

  return "http://localhost:3000";
}
