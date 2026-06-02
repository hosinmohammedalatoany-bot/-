import { NextResponse } from "next/server";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ events: [] });
  }

  const { id } = await context.params;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<{ events?: unknown[]; detail?: string }>(
    `/api/workspace/customers/${id}/timeline/`,
    { accessToken: access ?? undefined }
  );
  if (status === 404) {
    return NextResponse.json(
      { error: typeof data?.detail === "string" ? data.detail : "العميل غير موجود." },
      { status: 404 }
    );
  }
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل السجل الزمني.") },
      { status }
    );
  }
  return NextResponse.json(data);
}
