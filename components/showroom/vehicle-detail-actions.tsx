"use client";

import Link from "next/link";
import {
  buildWhatsAppUrl,
  formatIqd,
  inquiryMessage,
  type PublicCompany,
  type PublicVehicleDetail
} from "@/lib/public-showroom";

export function VehicleDetailActions({
  vehicle,
  company,
  pageUrl
}: {
  vehicle: PublicVehicleDetail;
  company: PublicCompany | null;
  pageUrl: string;
}) {
  const companyName = company?.company_name ?? "المعرض";
  const waMessage = inquiryMessage(companyName, vehicle, pageUrl);
  const waUrl = company?.phone ? buildWhatsAppUrl(company.phone, waMessage) : null;
  const verifyUrl = `/verify/vehicle/${vehicle.id}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {vehicle.show_sale_price && vehicle.sale_price && (
        <p className="w-full text-2xl font-black text-[#d6a84f] sm:w-auto">
          {formatIqd(vehicle.sale_price)}
        </p>
      )}
      {waUrl ? (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white sm:flex-none"
        >
          تواصل عبر واتساب
        </a>
      ) : (
        <p className="text-sm text-amber-200/80">رقم واتساب غير مُعد في إعدادات الشركة.</p>
      )}
      <Link
        href={verifyUrl}
        className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 sm:flex-none"
      >
        رمز QR للتحقق
      </Link>
    </div>
  );
}
