import { NextResponse } from "next/server";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ ok: true, message: "تم إنهاء الجلسات المحلية." });
  }

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<{ ok?: boolean; message?: string }>(
    "/api/auth/logout-all/",
    { method: "POST", accessToken: access ?? undefined }
  );
  if (status !== 200 || !data?.ok) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر إنهاء الجلسات.") },
      { status: status >= 400 ? status : 400 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: data.message ?? "تم إنهاء الجلسات على الأجهزة الأخرى."
  });
}
