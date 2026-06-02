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
    return NextResponse.json({ error: "لوحة التحكم تتطلب ربط API." }, { status: 503 });
  }

  const url = new URL(request.url);
  const branch = url.searchParams.get("branch_name");
  const qs = branch ? `?branch_name=${encodeURIComponent(branch)}` : "";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(
    `/api/workspace/dashboard/${qs}`,
    { accessToken: access ?? undefined }
  );
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل مؤشرات اللوحة.") },
      { status }
    );
  }
  return NextResponse.json({ metrics: data });
}
