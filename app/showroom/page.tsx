import { ShowroomHeader } from "@/components/showroom/showroom-header";
import { ShowroomSearch } from "@/components/showroom/showroom-search";
import { VehicleCard } from "@/components/showroom/vehicle-card";
import { loadPublicCatalog, loadPublicCompany } from "@/lib/server/public-showroom-fetch";

export default async function ShowroomPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [company, catalog] = await Promise.all([loadPublicCompany(), loadPublicCatalog(q)]);

  return (
    <>
      <ShowroomHeader company={company} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-8">
          <p className="mb-4 text-sm leading-relaxed text-white/55">
            جميع الأسعار بالدينار العراقي. يتم عرض السيارات المتوفرة للبيع فقط — لا تظهر
            التكاليف الداخلية أو بيانات المحاسبة.
          </p>
          <ShowroomSearch initialQ={q} />
        </section>

        {catalog.vehicles.length === 0 ? (
          <div className="luxury-panel rounded-2xl p-10 text-center">
            <p className="text-lg font-semibold text-white/70">لا توجد سيارات متوفرة حالياً</p>
            <p className="mt-2 text-sm text-white/45">
              {q ? "جرّب تغيير كلمات البحث أو عد لاحقاً." : "تابعنا لمعرفة الوصول الجديد."}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-white/45">{catalog.count} سيارة متوفرة</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          </>
        )}
      </main>
      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/35">
        {company?.company_name ?? "براء رائد"} — {company?.address || "العراق"}
      </footer>
    </>
  );
}
