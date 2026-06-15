import { NextResponse } from "next/server";
import { installmentFromScheduleApi, paymentCreateToApi } from "@/lib/installments-map";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

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
    payment?: Record<string, unknown>;
    schedule_entry?: Record<string, unknown>;
    detail?: string;
  }>("/api/installments/payments/", {
    method: "POST",
    accessToken: access ?? undefined,
    body: JSON.stringify(
      paymentCreateToApi({
        scheduleEntryId: String(body.installmentId ?? body.scheduleEntryId ?? ""),
        amount: Number(body.amount) || 0,
        paymentDate: body.paymentDate ? String(body.paymentDate) : undefined,
        receiptReference: body.receiptReference ? String(body.receiptReference) : undefined,
        saleInvoiceId: body.saleInvoiceId ? String(body.saleInvoiceId) : undefined,
        notes: body.notes ? String(body.notes) : undefined
      })
    )
  });
  if (status !== 201 || !data?.schedule_entry) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تسجيل الدفعة.") },
      { status }
    );
  }
  return NextResponse.json({
    ok: true,
    scheduleEntry: installmentFromScheduleApi(data.schedule_entry)
  });
}
