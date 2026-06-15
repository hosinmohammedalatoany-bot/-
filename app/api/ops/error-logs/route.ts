import { NextRequest, NextResponse } from "next/server";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "يتطلب ربط API." }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const query = new URLSearchParams();
  const limit = params.get("limit");
  const level = params.get("level");
  if (limit) query.set("limit", limit);
  if (level) query.set("level", level);
  const qs = query.toString();

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<{ logs?: unknown[] }>(
    qs ? `/api/ops/error-logs/?${qs}` : "/api/ops/error-logs/",
    { accessToken: access ?? undefined }
  );
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل سجل الأخطاء.") },
      { status }
    );
  }
  return NextResponse.json(data);
}
