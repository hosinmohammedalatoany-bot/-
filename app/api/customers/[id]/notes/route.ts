import { NextResponse } from "next/server";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json([]);
  }

  const { id } = await context.params;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<unknown[]>(
    `/api/customers/${id}/notes/`,
    { accessToken: access ?? undefined }
  );
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل الملاحظات.") },
      { status }
    );
  }
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "يتطلب ربط API." }, { status: 503 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(
    `/api/customers/${id}/notes/`,
    {
      method: "POST",
      accessToken: access ?? undefined,
      body: JSON.stringify(body)
    }
  );
  if (status !== 201 && status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر حفظ الملاحظة.") },
      { status }
    );
  }
  return NextResponse.json(data, { status });
}
