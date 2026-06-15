import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { resolvePublicAppOrigin } from "@/lib/runtime-config";
import { formatCurrency } from "@/lib/utils";

type PublicVehicle = {
  id: string;
  internal_number: string;
  manufacturer: string;
  model: string;
  year: number;
  exterior_color: string;
  status: string;
  branch: string;
  show_sale_price?: boolean;
  sale_price?: string | null;
};

async function loadVehicle(id: string): Promise<PublicVehicle | null> {
  const base =
    process.env.DJANGO_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "";
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/api/vehicles/verify/${id}/`, {
        next: { revalidate: 60 }
      });
      if (res.ok) return (await res.json()) as PublicVehicle;
    } catch {
      /* fall through */
    }
  }
  try {
    const origin = resolvePublicAppOrigin();
    const res = await fetch(`${origin.replace(/\/$/, "")}/api/public/vehicles/${id}`, {
      next: { revalidate: 60 }
    });
    if (res.ok) return (await res.json()) as PublicVehicle;
  } catch {
    return null;
  }
  return null;
}

const statusLabel: Record<string, string> = {
  available: "متوفرة للبيع",
  reserved: "محجوزة",
  sold: "مباعة",
  unavailable: "غير متاحة حالياً"
};

export default async function VerifyVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const vehicle = await loadVehicle(decoded);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="luxury-panel rounded-[2rem] p-8 text-center">
        <BrandLogo />
        <h1 className="mt-6 text-xl font-black text-white">التحقق من السيارة</h1>
        {vehicle ? (
          <>
            <p className="mt-4 text-lg font-bold text-white">
              {vehicle.manufacturer} {vehicle.model} — {vehicle.year}
            </p>
            <p className="mt-2 text-sm text-white/60">
              الرقم الداخلي:{" "}
              <span className="font-mono text-[#d6a84f]" dir="ltr">
                {vehicle.internal_number}
              </span>
            </p>
            {vehicle.exterior_color && (
              <p className="mt-1 text-sm text-white/50">اللون: {vehicle.exterior_color}</p>
            )}
            {vehicle.branch && <p className="mt-1 text-sm text-white/50">الفرع: {vehicle.branch}</p>}
            <p className="mt-4 text-sm font-semibold text-emerald-400">
              {statusLabel[vehicle.status] ?? vehicle.status}
            </p>
            {vehicle.show_sale_price && vehicle.sale_price && (
              <p className="mt-2 text-base text-[#d6a84f]">
                السعر: {formatCurrency(Number(vehicle.sale_price))}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-white/60">
              معرّف السيارة:{" "}
              <span className="font-mono text-[#d6a84f]" dir="ltr">
                {decoded}
              </span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              لم يتم العثور على بيانات عامة لهذه السيارة، أو أنها غير متاحة للعرض.
            </p>
          </>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {vehicle?.status === "available" && (
            <Link
              href={`/showroom/${vehicle.id}`}
              className="inline-block rounded-xl border border-[#d6a84f]/50 px-6 py-3 text-sm font-bold text-[#d6a84f]"
            >
              عرض في المعرض
            </Link>
          )}
          <Link
            href="/showroom"
            className="inline-block rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white"
          >
            كل السيارات
          </Link>
          <Link
            href="/login"
            className="inline-block rounded-xl bg-[#d6a84f] px-6 py-3 text-sm font-bold text-black"
          >
            دخول الموظفين
          </Link>
        </div>
      </div>
    </div>
  );
}
