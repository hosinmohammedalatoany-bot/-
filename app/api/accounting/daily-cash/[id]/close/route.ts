import { NextResponse } from "next/server";
import { dailyCashFromApi } from "@/lib/accounting-map";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة المحاسبة تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await params;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(
    `/api/accounting/daily-cash/${id}/close/`,
    {
      method: "POST",
      accessToken: access ?? undefined,
      body: JSON.stringify({})
    }
  );
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر إغلاق الصندوق.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, register: dailyCashFromApi(data) });
}
