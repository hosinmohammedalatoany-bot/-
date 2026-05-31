"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { useShowroomStore } from "@/lib/showroom-store";
import { formatCurrency } from "@/lib/utils";

export default function PublicShowroomPage() {
  const vehicles = useShowroomStore((s) => s.vehicles);
  const company = useShowroomStore((s) => s.company);
  const hydrate = useShowroomStore((s) => s.hydrate);
  const isHydrated = useShowroomStore((s) => s.isHydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const available = vehicles.filter((v) => v.status === "available");

  if (!isHydrated) {
    return <p className="p-10 text-center text-white/60">جاري التحميل…</p>;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/10 px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div>
              <h1 className="text-xl font-bold">{company.companyName}</h1>
              <p className="text-sm text-white/60">{company.address}</p>
            </div>
          </div>
          <a href={`tel:${company.phone.replace(/\s/g, "")}`} className="text-sm text-[#d6a84f]">
            {company.phone}
          </a>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {available.length === 0 ? (
          <p className="col-span-full text-center text-white/60">لا توجد سيارات معروضة حالياً.</p>
        ) : (
          available.map((v) => (
            <article key={v.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-[#d6a84f]">{v.year} · {v.branch}</p>
              <h2 className="mt-1 text-lg font-semibold">
                {v.manufacturer} {v.model} {v.trim}
              </h2>
              <p className="mt-2 text-xl font-bold text-emerald-300">{formatCurrency(v.salePrice)}</p>
              <p className="mt-1 text-xs text-white/50">
                {v.mileage.toLocaleString()} km · {v.fuelType} · {v.transmission}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${v.manufacturer} ${v.model} ${v.year} - ${formatCurrency(v.salePrice)}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold"
                >
                  واتساب
                </a>
                <Link href="/" className="rounded-lg border border-white/20 px-3 py-1.5 text-xs">
                  طلب حجز (لوحة الإدارة)
                </Link>
              </div>
            </article>
          ))
        )}
      </main>
    </div>
  );
}
