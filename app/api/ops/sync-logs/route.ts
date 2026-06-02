import { NextRequest, NextResponse } from "next/server";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "يتطلب ربط API." }, { status: 503 });
  }

  const limit = request.nextUrl.searchParams.get("limit") ?? "100";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<{ logs?: unknown[] }>(
    `/api/ops/sync-logs/?limit=${encodeURIComponent(limit)}`,
    { accessToken: access ?? undefined }
  );
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل سجل المزامنة.") },
      { status }
    );
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>("/api/ops/sync-logs/", {
    method: "POST",
    body: JSON.stringify(body),
    accessToken: access ?? undefined
  });
  if (status !== 201 && status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تسجيل المزامنة.") },
      { status }
    );
  }
  return NextResponse.json(data, { status: status === 201 ? 201 : 200 });
}
