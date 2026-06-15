import { NextResponse } from "next/server";
import {
  djangoErrorMessage,
  djangoFetch,
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

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  if (!type) {
    return NextResponse.json({ error: "حدد نوع التقرير." }, { status: 400 });
  }
  const query = url.searchParams.toString();
  const path = `/api/reports/export/?${query}`;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const format = (
    url.searchParams.get("export_format") ||
    url.searchParams.get("format") ||
    "csv"
  ).toLowerCase();

  if (format === "csv") {
    const res = await djangoFetch(path, {
      accessToken: access ?? undefined,
      method: "GET"
    });
    if (!res.ok) {
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      return NextResponse.json(
        { error: djangoErrorMessage(body, "تعذر تصدير التقرير.") },
        { status: res.status }
      );
    }
    const csv = await res.text();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-report.csv"`
      }
    });
  }

  const res = await djangoFetch(path, {
    accessToken: access ?? undefined,
    method: "GET"
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: djangoErrorMessage(body, "تعذر تصدير التقرير.") },
      { status: res.status }
    );
  }
  return NextResponse.json(body);
}
