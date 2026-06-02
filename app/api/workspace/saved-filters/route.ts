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
    return NextResponse.json({ filters: [] });
  }

  const url = new URL(request.url);
  const moduleKey = url.searchParams.get("module_key");
  const qs = moduleKey ? `?module_key=${encodeURIComponent(moduleKey)}` : "";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<{ filters?: unknown[] }>(
    `/api/workspace/saved-filters/${qs}`,
    { accessToken: access ?? undefined }
  );
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل الفلاتر.") },
      { status }
    );
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "حفظ الفلاتر يتطلب ربط API." }, { status: 503 });
  }

  const body = await request.json();
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(
    "/api/workspace/saved-filters/",
    {
      method: "POST",
      accessToken: access ?? undefined,
      body: JSON.stringify(body)
    }
  );
  if (status !== 200 && status !== 201) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر حفظ الفلتر.") },
      { status }
    );
  }
  return NextResponse.json(data, { status });
}
