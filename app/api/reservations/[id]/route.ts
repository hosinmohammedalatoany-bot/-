import { NextResponse } from "next/server";
import { djangoErrorMessage, djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة الحجوزات تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await context.params;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson(`/api/sales/reservations/${id}/`, {
    method: "DELETE",
    accessToken: access ?? undefined
  });
  if (status !== 204) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر إلغاء الحجز.") },
      { status }
    );
  }
  return new NextResponse(null, { status: 204 });
}
