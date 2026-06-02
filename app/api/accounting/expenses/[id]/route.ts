import { NextResponse } from "next/server";
import { djangoErrorMessage, djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة المحاسبة تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await params;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson(`/api/accounting/expenses/${id}/`, {
    method: "DELETE",
    accessToken: access ?? undefined
  });
  if (status !== 204) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر حذف المصروف.") },
      { status }
    );
  }
  return new NextResponse(null, { status: 204 });
}
