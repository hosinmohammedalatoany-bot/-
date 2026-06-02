import { NextResponse } from "next/server";
import { customerFromApi, customerToApi } from "@/lib/customers-map";
import type { CustomerInput } from "@/lib/validation";
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
    return NextResponse.json({ error: "واجهة العملاء تتطلب ربط API." }, { status: 503 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/api/customers/?${query}` : "/api/customers/";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<unknown[]>(path, {
    accessToken: access ?? undefined
  });
  if (status !== 200 || !Array.isArray(data)) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل العملاء.") },
      { status }
    );
  }
  return NextResponse.json({
    customers: data.map((row) => customerFromApi(row as Record<string, unknown>)),
    source: "api"
  });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة العملاء تتطلب ربط API." }, { status: 503 });
  }

  const body = (await request.json()) as CustomerInput & { branch?: string };
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>("/api/customers/", {
    method: "POST",
    accessToken: access ?? undefined,
    body: JSON.stringify(customerToApi(body))
  });
  if (status !== 201) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر إضافة العميل.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, customer: customerFromApi(data) });
}
