import { NextResponse } from "next/server";
import { leadNoteFromApi } from "@/lib/customers-map";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة العملاء المحتملين تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json()) as { body: string };
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(`/api/leads/${id}/notes/`, {
    method: "POST",
    accessToken: access ?? undefined,
    body: JSON.stringify({ body: body.body })
  });
  if (status !== 201) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر إضافة الملاحظة.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, note: leadNoteFromApi(data) });
}
