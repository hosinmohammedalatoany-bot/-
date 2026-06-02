import { NextResponse } from "next/server";
import { vehicleFromApi } from "@/lib/vehicles-map";
import type { Vehicle } from "@/lib/domain";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

const statusToApi: Record<Vehicle["status"], string> = {
  available: "available",
  reserved: "reserved",
  sold: "sold",
  maintenance: "maintenance",
  "not-ready": "not_ready"
};

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة السيارات تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json()) as { status: Vehicle["status"] };
  const apiStatus = statusToApi[body.status];
  if (!apiStatus) {
    return NextResponse.json({ error: "حالة غير صالحة." }, { status: 400 });
  }

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(
    `/api/vehicles/${id}/status/`,
    {
      method: "POST",
      accessToken: access ?? undefined,
      body: JSON.stringify({ status: apiStatus })
    }
  );
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحديث الحالة.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, vehicle: vehicleFromApi(data) });
}
