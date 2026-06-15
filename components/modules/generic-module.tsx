"use client";

import Link from "next/link";
import { modules, type ModuleKey } from "@/lib/domain";
import { moduleTitlesAr, modulePath } from "@/lib/i18n/ar";
import { ModulePage } from "@/components/modules/module-page";
import { PrimaryButton } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";

const implemented: ModuleKey[] = [
  "dashboard",
  "cars",
  "customers",
  "leads",
  "sales",
  "installments",
  "inventory",
  "accounting",
  "reservations",
  "printing",
  "permissions",
  "backup-sync",
  "system-health",
  "reports",
  "settings",
  "branches",
  "notifications"
];

export function GenericModule({ moduleKey }: { moduleKey: ModuleKey }) {
  const meta = modules.find((m) => m.key === moduleKey);
  const attachLocalFile = useShowroomStore((s) => s.attachLocalFile);
  const isImplementedElsewhere = implemented.includes(moduleKey);

  return (
    <ModulePage moduleKey={moduleKey}>
      <section className="luxury-panel rounded-[2rem] p-5">
        <p className="text-sm text-[#d6a84f]">قسم {moduleTitlesAr[moduleKey]}</p>
        <p className="mt-2 text-sm text-white/65">
          {meta?.description ?? "إدارة هذا القسم ضمن نظام براء رائد."}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {(meta?.capabilities ?? []).map((cap) => (
            <li key={cap} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
              {cap}
            </li>
          ))}
        </ul>
        <div className="no-print mt-6 flex flex-wrap gap-2">
          {isImplementedElsewhere ? (
            <Link href={modulePath(moduleKey)}>
              <PrimaryButton type="button">فتح القسم الكامل</PrimaryButton>
            </Link>
          ) : (
            <>
              <PrimaryButton type="button" onClick={() => attachLocalFile(moduleTitlesAr[moduleKey])}>
                رفع مستند محلي (وضع عدم الاتصال)
              </PrimaryButton>
              <Link href="/dashboard/cars">
                <PrimaryButton type="button">السيارات</PrimaryButton>
              </Link>
              <Link href="/dashboard/customers">
                <PrimaryButton type="button">العملاء</PrimaryButton>
              </Link>
              <Link href="/dashboard/sales">
                <PrimaryButton type="button">المبيعات</PrimaryButton>
              </Link>
            </>
          )}
        </div>
      </section>
    </ModulePage>
  );
}
