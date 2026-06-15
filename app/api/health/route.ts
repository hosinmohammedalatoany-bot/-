import { NextResponse } from "next/server";
import { djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const base = {
    service: "Baraa Raed Car Showroom Management System",
    timestamp,
    checks: {
      next: "ok",
      offlineQueue: "client IndexedDB enabled",
      pwa: "manifest.webmanifest + service worker /sw.js",
      syncIdempotency: "device-scoped operation receipts"
    }
  };

  const user = await getUserFromRequest(request);
  if (user && isDjangoAuthEnabled()) {
    const access = readJwtAccessFromCookie(request.headers.get("cookie"));
    const { status, data } = await djangoJson<Record<string, unknown>>("/api/ops/health/", {
      accessToken: access ?? undefined
    });
    if (status === 200 && data && typeof data === "object") {
      return NextResponse.json({
        ...base,
        status: data.status ?? "healthy",
        django: data,
        authenticated: true
      });
    }
    return NextResponse.json({
      ...base,
      status: "degraded",
      django: { unreachable: true, httpStatus: status },
      authenticated: Boolean(user)
    });
  }

  return NextResponse.json({
    ...base,
    status: "healthy",
    checks: {
      ...base.checks,
      api: isDjangoAuthEnabled() ? "django configured — sign in for full health" : "local mode",
      database: isDjangoAuthEnabled()
        ? "use authenticated /api/ops/health"
        : "configure POSTGRES_URL in production"
    }
  });
}
