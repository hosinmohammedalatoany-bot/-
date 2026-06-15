import { NextResponse } from "next/server";
import { installmentFromScheduleApi } from "@/lib/installments-map";
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
    return NextResponse.json({ error: "واجهة التقسيط تتطلب ربط API." }, { status: 503 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query
    ? `/api/installments/schedule/?${query}`
    : "/api/installments/schedule/";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<unknown[]>(path, {
    accessToken: access ?? undefined
  });
  if (status !== 200 || !Array.isArray(data)) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل جدول الأقساط.") },
      { status }
    );
  }
  return NextResponse.json({
    installments: data.map((row) =>
      installmentFromScheduleApi(row as Record<string, unknown>)
    ),
    source: "api"
  });
}
