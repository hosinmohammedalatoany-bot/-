import { NextResponse } from "next/server";
import { djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }

  const base = {
    service: "Baraa Raed Car Showroom Management System",
    timestamp: new Date().toISOString(),
    client: {
      offlineQueue: "IndexedDB enabled",
      pwa: "manifest + service worker",
      syncIdempotency: "device-scoped operation receipts"
    }
  };

  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({
      ...base,
      status: "degraded",
      api: "local-only",
      checks: {
        api: "Next.js only — configure NEXT_PUBLIC_API_BASE_URL for server ops"
      }
    });
  }

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>("/api/ops/health/", {
    accessToken: access ?? undefined
  });

  if (status !== 200 || !data || typeof data !== "object") {
    return NextResponse.json(
      {
        ...base,
        status: "degraded",
        api: "unreachable",
        checks: { django: "failed", httpStatus: status }
      },
      { status: status >= 500 ? 503 : status }
    );
  }

  return NextResponse.json({
    ...base,
    ...data,
    source: "django-ops"
  });
}
