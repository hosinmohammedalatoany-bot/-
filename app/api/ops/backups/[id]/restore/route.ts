import { NextRequest, NextResponse } from "next/server";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "يتطلب ربط API." }, { status: 503 });
  }

  const { id } = await context.params;
  let body: { confirm?: boolean } = {};
  try {
    body = (await request.json()) as { confirm?: boolean };
  } catch {
    body = {};
  }

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(
    `/api/ops/backups/${id}/restore/`,
    {
      method: "POST",
      body: JSON.stringify(body),
      accessToken: access ?? undefined
    }
  );
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "فشلت الاستعادة.") },
      { status }
    );
  }
  return NextResponse.json(data);
}
