import Link from "next/link";
import { notFound } from "next/navigation";
import { ShowroomHeader } from "@/components/showroom/showroom-header";
import { VehicleDetailActions } from "@/components/showroom/vehicle-detail-actions";
import { formatIqd, vehicleTitle } from "@/lib/public-showroom";
import {
  loadPublicCompany,
  loadPublicVehicle,
  publicVehiclePageUrl
} from "@/lib/server/public-showroom-fetch";

export default async function ShowroomVehiclePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [company, vehicle] = await Promise.all([loadPublicCompany(), loadPublicVehicle(id)]);

  if (!vehicle) {
    notFound();
  }

  const pageUrl = publicVehiclePageUrl(id);

  return (
    <>
      <ShowroomHeader company={company} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/showroom" className="text-sm text-[#d6a84f] hover:underline">
          ← العودة للمعرض
        </Link>

        <h1 className="mt-6 text-2xl font-black text-white">{vehicleTitle(vehicle)}</h1>
        {vehicle.trim && <p className="mt-1 text-sm text-white/50">{vehicle.trim}</p>}

        {vehicle.images.length > 0 ? (
          <div className="mt-6 space-y-3">
            {vehicle.images.map((img) => (
              <figure key={img.id} className="overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.data_url} alt={img.caption || vehicleTitle(vehicle)} className="w-full" />
                {img.caption && (
                  <figcaption className="px-3 py-2 text-xs text-white/45">{img.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <div className="luxury-panel mt-6 rounded-2xl p-8 text-center text-sm text-white/40">
            لا توجد صور لهذه السيارة
          </div>
        )}

        <section className="luxury-panel mt-8 rounded-2xl p-5">
          <VehicleDetailActions vehicle={vehicle} company={company} pageUrl={pageUrl} />
        </section>

        <section className="luxury-panel mt-6 rounded-2xl p-5 text-sm text-white/70">
          <h2 className="mb-4 font-bold text-white">المواصفات</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-white/40">السنة</dt>
              <dd className="font-semibold">{vehicle.year}</dd>
            </div>
            <div>
              <dt className="text-white/40">المسافة</dt>
              <dd className="font-semibold" dir="ltr">
                {vehicle.mileage.toLocaleString("ar-IQ")} km
              </dd>
            </div>
            <div>
              <dt className="text-white/40">اللون الخارجي</dt>
              <dd className="font-semibold">{vehicle.exterior_color || "—"}</dd>
            </div>
            <div>
              <dt className="text-white/40">اللون الداخلي</dt>
              <dd className="font-semibold">{vehicle.interior_color || "—"}</dd>
            </div>
            <div>
              <dt className="text-white/40">الوقود</dt>
              <dd className="font-semibold">{vehicle.fuel_type}</dd>
            </div>
            <div>
              <dt className="text-white/40">ناقل الحركة</dt>
              <dd className="font-semibold">{vehicle.transmission}</dd>
            </div>
            {vehicle.branch && (
              <div className="sm:col-span-2">
                <dt className="text-white/40">الفرع</dt>
                <dd className="font-semibold">{vehicle.branch}</dd>
              </div>
            )}
            {vehicle.show_sale_price && vehicle.sale_price && (
              <div className="sm:col-span-2">
                <dt className="text-white/40">السعر</dt>
                <dd className="text-lg font-black text-[#d6a84f]">
                  {formatIqd(vehicle.sale_price)}
                </dd>
              </div>
            )}
          </dl>
        </section>
      </main>
    </>
  );
}
