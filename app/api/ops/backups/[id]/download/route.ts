import { NextRequest, NextResponse } from "next/server";
import { djangoFetch, isDjangoAuthEnabled } from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(
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
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const res = await djangoFetch(`/api/ops/backups/${id}/download/`, {
    accessToken: access ?? undefined
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { detail?: string };
      return NextResponse.json(
        { error: json.detail ?? "تعذر تنزيل النسخة." },
        { status: res.status }
      );
    } catch {
      return NextResponse.json({ error: "تعذر تنزيل النسخة." }, { status: res.status });
    }
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const fileName = match?.[1] ?? `backup-${id}.json`;

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
