import { NextResponse } from "next/server";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  const { id } = await context.params;
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ revisions: [], source: "offline" });
  }

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<{ revisions?: unknown[] }>(
    `/api/sales/invoices/${encodeURIComponent(id)}/revisions/`,
    { accessToken: access ?? undefined }
  );
  if (status !== 200 || !data) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل سجل الفاتورة.") },
      { status }
    );
  }
  return NextResponse.json({ ...data, source: "api" });
}
