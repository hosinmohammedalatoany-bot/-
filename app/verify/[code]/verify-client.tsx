"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

interface VerifyPayload {
  code: string;
  status: string;
  amount?: number;
  customer?: string;
  vehicle?: string;
  issuedAt?: string;
}

export function VerifyDocumentClient({ code }: { code: string }) {
  const [data, setData] = useState<VerifyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/verify/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json as VerifyPayload);
      })
      .catch(() => setError("تعذر التحقق من المستند."));
  }, [code]);

  return (
    <div className="rtl-support mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-12">
      <BrandLogo />
      <h1 className="gold-text text-2xl font-bold">التحقق من المستند</h1>
      <p className="text-sm text-white/60">رمز: {code}</p>
      {error && <p className="rounded-xl border border-red-500/40 bg-red-950/50 p-4 text-red-200">{error}</p>}
      {data && (
        <dl className="luxury-panel grid gap-3 rounded-3xl p-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-white/50">الحالة</dt>
            <dd className="font-semibold text-emerald-300">{data.status}</dd>
          </div>
          {data.amount != null && (
            <div className="flex justify-between">
              <dt className="text-white/50">المبلغ</dt>
              <dd className="text-white">{data.amount}</dd>
            </div>
          )}
          {data.customer && (
            <div className="flex justify-between">
              <dt className="text-white/50">العميل</dt>
              <dd className="text-white">{data.customer}</dd>
            </div>
          )}
          {data.vehicle && (
            <div className="flex justify-between">
              <dt className="text-white/50">السيارة</dt>
              <dd className="text-white">{data.vehicle}</dd>
            </div>
          )}
          {data.issuedAt && (
            <div className="flex justify-between">
              <dt className="text-white/50">تاريخ الإصدار</dt>
              <dd className="text-white">{new Date(data.issuedAt).toLocaleString("ar-IQ")}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
