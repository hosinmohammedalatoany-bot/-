import { NextResponse } from "next/server";
import { vehicleFromApi, vehicleToApi } from "@/lib/vehicles-map";
import type { VehicleInput } from "@/lib/validation";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة السيارات تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await params;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(`/api/vehicles/${id}/`, {
    accessToken: access ?? undefined
  });
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل السيارة.") },
      { status }
    );
  }
  return NextResponse.json({ vehicle: vehicleFromApi(data) });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة السيارات تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<VehicleInput> & { status?: string };
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const payload =
    body.status && !body.internalNumber
      ? { status: body.status === "not-ready" ? "not_ready" : body.status }
      : vehicleToApi(body as VehicleInput);

  const { status, data } = await djangoJson<Record<string, unknown>>(`/api/vehicles/${id}/`, {
    method: "PATCH",
    accessToken: access ?? undefined,
    body: JSON.stringify(payload)
  });
  if (status !== 200) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحديث السيارة.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, vehicle: vehicleFromApi(data) });
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة السيارات تتطلب ربط API." }, { status: 503 });
  }

  const { id } = await params;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson(`/api/vehicles/${id}/`, {
    method: "DELETE",
    accessToken: access ?? undefined
  });
  if (status !== 204) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر أرشفة السيارة.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true });
}
