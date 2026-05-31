import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="luxury-panel max-w-xl rounded-[2rem] p-8 text-center">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="mt-8 text-3xl font-black">وضع عدم الاتصال مفعل</h1>
        <p className="mt-4 text-white/60">
          يحتفظ نظام براء رائد بعمليات السيارات والعملاء والفواتير والأقساط والملفات داخل الطابور المحلي حتى
          يعود الاتصال ويتم تنفيذ المزامنة.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-[#d6a84f] px-5 py-3 font-bold text-black transition hover:bg-[#f3c96b]"
        >
          الرجوع إلى لوحة التحكم
        </Link>
      </section>
    </main>
  );
}
