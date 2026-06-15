import { NextResponse } from "next/server";
import { djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";

export async function GET() {
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "غير متاح." }, { status: 503 });
  }
  const { status, data } = await djangoJson<Record<string, unknown>>(
    "/api/organization/public/company/"
  );
  return NextResponse.json(data, { status });
}
