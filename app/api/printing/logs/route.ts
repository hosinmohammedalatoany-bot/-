import { NextResponse } from "next/server";
import { printLogFromApi } from "@/lib/print-log-api";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة الطباعة تتطلب ربط API." }, { status: 503 });
  }

  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "200";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<unknown[]>(
    `/api/sales/print-logs/?limit=${encodeURIComponent(limit)}`,
    { accessToken: access ?? undefined }
  );
  if (status !== 200 || !Array.isArray(data)) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل سجل الطباعة.") },
      { status }
    );
  }
  return NextResponse.json({
    logs: data.map((row) => printLogFromApi(row as Record<string, unknown>)),
    source: "api"
  });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة الطباعة تتطلب ربط API." }, { status: 503 });
  }

  const body = (await request.json()) as {
    document_type?: string;
    document_number?: string;
    branch_name?: string;
  };
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(
    "/api/sales/print-logs/",
    {
      method: "POST",
      accessToken: access ?? undefined,
      body: JSON.stringify(body)
    }
  );
  if (status !== 201) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تسجيل الطباعة.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, log: printLogFromApi(data) });
}
