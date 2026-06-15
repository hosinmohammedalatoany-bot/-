import { NextRequest, NextResponse } from "next/server";
import { djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";

export async function GET(request: NextRequest) {
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "غير متاح." }, { status: 503 });
  }
  const search = request.nextUrl.searchParams.toString();
  const path = search ? `/api/vehicles/public/?${search}` : "/api/vehicles/public/";
  const { status, data } = await djangoJson<Record<string, unknown>>(path);
  return NextResponse.json(data, { status });
}
