import { NextResponse } from "next/server";
import { reservationFromApi, reservationToApi } from "@/lib/sales-map";
import type { ReservationInput } from "@/lib/validation";
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
    return NextResponse.json({ error: "واجهة الحجوزات تتطلب ربط API." }, { status: 503 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query
    ? `/api/sales/reservations/?${query}`
    : "/api/sales/reservations/";
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<unknown[]>(path, {
    accessToken: access ?? undefined
  });
  if (status !== 200 || !Array.isArray(data)) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل الحجوزات.") },
      { status }
    );
  }
  return NextResponse.json({
    reservations: data.map((row) =>
      reservationFromApi(row as Record<string, unknown>)
    ),
    source: "api"
  });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة الحجوزات تتطلب ربط API." }, { status: 503 });
  }

  const body = (await request.json()) as ReservationInput;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(
    "/api/sales/reservations/",
    {
      method: "POST",
      accessToken: access ?? undefined,
      body: JSON.stringify(reservationToApi(body))
    }
  );
  if (status !== 201) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر إنشاء الحجز.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, reservation: reservationFromApi(data) });
}
