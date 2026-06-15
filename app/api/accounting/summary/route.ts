import { NextResponse } from "next/server";
import { summaryFromApi } from "@/lib/accounting-map";
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
  const path = query ? `/api/accounting/summary/?${query}` : "/api/accounting/summary/";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(path, {
    accessToken: access ?? undefined
  });
  if (status !== 200 || !data || typeof data !== "object") {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل الملخص المالي.") },
      { status }
    );
  }
  return NextResponse.json({ summary: summaryFromApi(data), source: "api" });
}
