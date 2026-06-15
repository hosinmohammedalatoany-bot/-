import { NextResponse } from "next/server";
import { leadFromApi } from "@/lib/customers-map";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة العملاء المحتملين تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await params;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(`/api/leads/${id}/`, {
    accessToken: access ?? undefined
  });
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل العميل المحتمل.") },
      { status }
    );
  }
  return NextResponse.json({ lead: leadFromApi(data) });
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة العملاء المحتملين تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await params;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson(`/api/leads/${id}/`, {
    method: "DELETE",
    accessToken: access ?? undefined
  });
  if (status !== 204 && status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر أرشفة العميل المحتمل.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true });
}
