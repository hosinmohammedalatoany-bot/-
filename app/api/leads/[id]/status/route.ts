import { NextResponse } from "next/server";
import { leadFromApi } from "@/lib/customers-map";
import type { LeadPipelineStatus } from "@/lib/domain";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

type Params = { params: Promise<{ id: string }> };

const statusToApi: Record<LeadPipelineStatus, string> = {
  interested: "interested",
  contact: "contact",
  reserved: "reserved",
  purchased: "purchased",
  cancelled: "cancelled"
};

export async function POST(request: Request, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة العملاء المحتملين تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json()) as { status: LeadPipelineStatus };
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(`/api/leads/${id}/status/`, {
    method: "POST",
    accessToken: access ?? undefined,
    body: JSON.stringify({ status: statusToApi[body.status] })
  });
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحديث الحالة.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, lead: leadFromApi(data) });
}
