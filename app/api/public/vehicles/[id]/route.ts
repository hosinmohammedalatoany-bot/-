import { NextResponse } from "next/server";
import { djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "غير متاح." }, { status: 503 });
  }
  const { id } = await params;
  const { status, data } = await djangoJson<Record<string, unknown>>(
    `/api/vehicles/public/${id}/`
  );
  if (status === 404) {
    return NextResponse.json({ error: "السيارة غير موجودة." }, { status: 404 });
  }
  return NextResponse.json(data, { status });
}
