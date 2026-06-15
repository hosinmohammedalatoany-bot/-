import { NextResponse } from "next/server";
import { leadFromApi, leadToApi } from "@/lib/customers-map";
import type { LeadInput } from "@/lib/validation";
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
    return NextResponse.json({ error: "واجهة العملاء المحتملين تتطلب ربط API." }, { status: 503 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/api/leads/?${query}` : "/api/leads/";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<unknown[]>(path, {
    accessToken: access ?? undefined
  });
  if (status !== 200 || !Array.isArray(data)) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل العملاء المحتملين.") },
      { status }
    );
  }
  return NextResponse.json({
    leads: data.map((row) => leadFromApi(row as Record<string, unknown>)),
    source: "api"
  });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة العملاء المحتملين تتطلب ربط API." }, { status: 503 });
  }

  const body = (await request.json()) as LeadInput & { status?: string; branch?: string };
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>("/api/leads/", {
    method: "POST",
    accessToken: access ?? undefined,
    body: JSON.stringify(
      leadToApi({
        name: body.name,
        phone: body.phone,
        source: body.source,
        assignedTo: body.assignedTo,
        vehicleId: body.vehicleId,
        note: body.note
      })
    )
  });
  if (status !== 201) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر إضافة العميل المحتمل.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, lead: leadFromApi(data) });
}
