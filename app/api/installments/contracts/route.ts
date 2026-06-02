import { NextResponse } from "next/server";
import {
  contractCreateToApi,
  contractFromApi,
  installmentFromScheduleApi
} from "@/lib/installments-map";
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
    return NextResponse.json({ error: "واجهة التقسيط تتطلب ربط API." }, { status: 503 });
  }

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<unknown[]>("/api/installments/contracts/", {
    accessToken: access ?? undefined
  });
  if (status !== 200 || !Array.isArray(data)) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل عقود التقسيط.") },
      { status }
    );
  }
  return NextResponse.json({
    contracts: data.map((row) => contractFromApi(row as Record<string, unknown>)),
    source: "api"
  });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة التقسيط تتطلب ربط API." }, { status: 503 });
  }

  const body = await request.json();
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<{
    contract?: Record<string, unknown>;
    schedule?: unknown[];
    detail?: string;
  }>("/api/installments/contracts/", {
    method: "POST",
    accessToken: access ?? undefined,
    body: JSON.stringify(
      contractCreateToApi({
        customerId: String(body.customerId ?? ""),
        vehicleId: String(body.vehicleId ?? ""),
        saleInvoiceId: body.saleInvoiceId ? String(body.saleInvoiceId) : undefined,
        totalAmount: Number(body.totalAmount) || 0,
        downPayment: Number(body.downPayment) || 0,
        installmentCount: Number(body.installmentCount) || 1,
        startDate: String(body.startDate ?? new Date().toISOString()),
        intervalDays: body.intervalDays ? Number(body.intervalDays) : 30,
        branchName: body.branchName ? String(body.branchName) : "",
        notes: body.notes ? String(body.notes) : ""
      })
    )
  });
  if (status !== 201 || !data?.contract) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر إنشاء عقد التقسيط.") },
      { status }
    );
  }
  return NextResponse.json({
    ok: true,
    contract: contractFromApi(data.contract),
    schedule: (data.schedule ?? []).map((row) =>
      installmentFromScheduleApi(row as Record<string, unknown>)
    )
  });
}
