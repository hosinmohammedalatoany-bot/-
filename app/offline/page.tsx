"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="luxury-panel max-w-xl rounded-[2rem] p-8 text-center">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="mt-8 text-3xl font-black">أنت غير متصل بالإنترنت</h1>
        <p className="mt-4 text-white/60">
          يحفظ نظام baraa raed عمليات السيارات والعملاء والفواتير والأقساط محلياً في IndexedDB.
          عند عودة الاتصال ستُرفع العمليات تلقائياً دون تكرار.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-xl bg-[#d6a84f] px-5 py-3 font-bold text-black transition hover:bg-[#f3c96b]"
          >
            لوحة التحكم
          </Link>
          <button
            type="button"
            className="inline-flex rounded-xl border border-white/20 px-5 py-3 font-bold text-white transition hover:bg-white/10"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </section>
    </main>
  );
}
