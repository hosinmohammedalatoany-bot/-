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
    return NextResponse.json({ error: "الإشعارات تتطلب ربط API." }, { status: 503 });
  }

  const url = new URL(request.url);
  const params = new URLSearchParams();
  const branch = url.searchParams.get("branch_name");
  if (branch) params.set("branch_name", branch);
  const limit = url.searchParams.get("limit");
  if (limit) params.set("limit", limit);
  const qs = params.toString() ? `?${params}` : "";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<{
    items?: unknown[];
    unread_count?: number;
  }>(`/api/workspace/notifications/${qs}`, { accessToken: access ?? undefined });
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل الإشعارات.") },
      { status }
    );
  }
  return NextResponse.json(data);
}
