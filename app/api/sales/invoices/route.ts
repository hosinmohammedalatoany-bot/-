import { NextResponse } from "next/server";
import { invoiceFromApi, invoiceToApi } from "@/lib/sales-map";
import type { InvoiceInput } from "@/lib/validation";
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
    return NextResponse.json({ error: "واجهة المبيعات تتطلب ربط API." }, { status: 503 });
  }

  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<unknown[]>("/api/sales/invoices/", {
    accessToken: access ?? undefined
  });
  if (status !== 200 || !Array.isArray(data)) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر تحميل فواتير المبيعات.") },
      { status }
    );
  }
  return NextResponse.json({
    invoices: data.map((row) => invoiceFromApi(row as Record<string, unknown>)),
    source: "api"
  });
}

type SalePostBody = InvoiceInput & {
  forceReservedSale?: boolean;
  forceDiscount?: boolean;
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }
  if (!isDjangoAuthEnabled()) {
    return NextResponse.json({ error: "واجهة المبيعات تتطلب ربط API." }, { status: 503 });
  }

  const body = (await request.json()) as SalePostBody;
  const { forceReservedSale, forceDiscount, ...invoiceInput } = body;
  const access = readJwtAccessFromCookie(request.headers.get("cookie"));
  const { status, data } = await djangoJson<Record<string, unknown>>(
    "/api/sales/invoices/",
    {
      method: "POST",
      accessToken: access ?? undefined,
      body: JSON.stringify(
        invoiceToApi(invoiceInput, { forceReservedSale, forceDiscount })
      )
    }
  );
  if (status !== 201) {
    return NextResponse.json(
      { error: djangoErrorMessage(data, "تعذر إصدار الفاتورة.") },
      { status }
    );
  }
  return NextResponse.json({ ok: true, invoice: invoiceFromApi(data) });
}
