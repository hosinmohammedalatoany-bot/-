"use client";

import type { ModuleKey } from "@/lib/domain";
import { modules } from "@/lib/domain";
import { moduleTitlesAr } from "@/lib/i18n/ar";

export function ModulePage({ moduleKey, children }: { moduleKey: ModuleKey; children: React.ReactNode }) {
  const meta = modules.find((m) => m.key === moduleKey);
  return (
    <div className="space-y-5">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h2 className="text-xl font-black text-white">{moduleTitlesAr[moduleKey]}</h2>
        <p className="mt-1 text-sm text-white/55">{meta?.description ?? "قسم النظام"}</p>
      </section>
      {children}
    </div>
  );
}
