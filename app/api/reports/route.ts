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
    return NextResponse.json({ error: "واجهة التقارير تتطلب ربط API." }, { status: 503 });
  }

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<{ reports?: unknown[] }>("/api/reports/", {
    accessToken: access ?? undefined
  });
  if (status !== 200 || !data) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل قائمة التقارير.") },
      { status }
    );
  }
  return NextResponse.json({ reports: data.reports ?? [], source: "api" });
}
