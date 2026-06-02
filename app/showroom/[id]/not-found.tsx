import Link from "next/link";
import { ShowroomHeader } from "@/components/showroom/showroom-header";
import { loadPublicCompany } from "@/lib/server/public-showroom-fetch";

export default async function ShowroomNotFound() {
  const company = await loadPublicCompany();
  return (
    <>
      <ShowroomHeader company={company} />
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-black text-white">السيارة غير متاحة</h1>
        <p className="mt-4 text-sm text-white/55">
          قد تكون السيارة مباعة أو غير معروضة للجمهور حالياً.
        </p>
        <Link
          href="/showroom"
          className="mt-8 inline-block rounded-xl bg-[#d6a84f] px-6 py-3 text-sm font-bold text-black"
        >
          العودة للمعرض
        </Link>
      </main>
    </>
  );
}
