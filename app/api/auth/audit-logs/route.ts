import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "سجل التدقيق يتطلب ربط API." }, { status: 503 });
  }

  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "200";
  const action = url.searchParams.get("action") ?? "";
  const qs = new URLSearchParams({ limit });
  if (action) qs.set("action", action);

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<{ logs?: unknown[] }>(
    `/api/auth/audit-logs/?${qs.toString()}`,
    { accessToken: access ?? undefined }
  );
  if (status !== 200 || !data) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل سجل التدقيق.") },
      { status }
    );
  }
  return NextResponse.json({ logs: data.logs ?? [], source: "api" });
}
