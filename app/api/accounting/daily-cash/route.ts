import { NextResponse } from "next/server";
import { dailyCashFromApi } from "@/lib/accounting-map";
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
    return NextResponse.json({ error: "واجهة المحاسبة تتطلب ربط API." }, { status: 503 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/api/accounting/daily-cash/?${query}` : "/api/accounting/daily-cash/";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<unknown[]>(path, {
    accessToken: access ?? undefined
  });
  if (status !== 200 || !Array.isArray(data)) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل الصندوق اليومي.") },
      { status }
    );
  }
  return NextResponse.json({
    registers: data.map((row) => dailyCashFromApi(row as Record<string, unknown>)),
    source: "api"
  });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة المحاسبة تتطلب ربط API." }, { status: 503 });
  }

  const body = (await request.json()) as {
    branch_name: string;
    business_date: string;
    opening_balance: number;
    notes?: string;
  };
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(
    "/api/accounting/daily-cash/",
    {
      method: "POST",
      accessToken: access ?? undefined,
      body: JSON.stringify(body)
    }
  );
  if (status !== 201) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر فتح الصندوق اليومي.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, register: dailyCashFromApi(data) });
}
