import { NextResponse } from "next/server";
import type { BranchRecord } from "@/lib/organization-map";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }

  const body = await request.json();

  if (isDjangoAuthEnabled()) {
    const access = readJwtAccessFromCookie(request.headers.get("cookie"));
    const { status, data } = await djangoJson<BranchRecord>(
      `/api/organization/branches/${id}/`,
      {
        method: "PATCH",
        accessToken: access ?? undefined,
        body: JSON.stringify(body)
      }
    );
    if (status !== 200) {
      return NextResponse.json(
        { error: djangoErrorMessage(data, "تعذر تحديث الفرع.") },
        { status }
      );
    }
    return NextResponse.json({ ok: true, branch: data });
  }

  return NextResponse.json({ error: "تعديل الفروع يتطلب تفعيل API." }, { status: 501 });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }

  if (isDjangoAuthEnabled()) {
    const access = readJwtAccessFromCookie(request.headers.get("cookie"));
    const { status, data } = await djangoJson<{ ok?: boolean; archived?: boolean; message?: string }>(
      `/api/organization/branches/${id}/`,
      {
        method: "DELETE",
        accessToken: access ?? undefined
      }
    );
    if (status !== 204 && status !== 200) {
      return NextResponse.json(
        { error: djangoErrorMessage(data, "تعذر حذف الفرع.") },
        { status }
      );
    }
    return NextResponse.json({ ok: true, ...(typeof data === "object" ? data : {}) });
  }

  return NextResponse.json({ error: "حذف الفروع يتطلب تفعيل API." }, { status: 501 });
}
