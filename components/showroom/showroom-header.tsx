import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import type { PublicCompany } from "@/lib/public-showroom";

export function ShowroomHeader({ company }: { company: PublicCompany | null }) {
  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          {company?.logo_data_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo_data_url}
              alt={company.company_name}
              className="h-12 w-12 rounded-xl border border-[#d6a84f]/40 object-contain"
            />
          ) : (
            <BrandLogo compact />
          )}
          <div>
            <h1 className="text-lg font-black text-white">
              {company?.company_name ?? "براء رائد"}
            </h1>
            <p className="text-xs text-white/50">معرض سيارات — عرض السيارات المتوفرة</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {company?.phone && (
            <a
              href={`tel:${company.phone.replace(/\s/g, "")}`}
              className="rounded-xl border border-white/15 px-4 py-2 text-white/80 hover:border-[#d6a84f]/50"
              dir="ltr"
            >
              {company.phone}
            </a>
          )}
          <Link
            href="/login"
            className="rounded-xl bg-white/10 px-4 py-2 text-white/70 hover:bg-white/15"
          >
            دخول الموظفين
          </Link>
        </div>
      </div>
    </header>
  );
}
