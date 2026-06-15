import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default async function VerifyReportPage({
  searchParams
}: {
  searchParams: Promise<{ id?: string; title?: string }>;
}) {
  const { id, title } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="luxury-panel rounded-[2rem] p-8 text-center">
        <BrandLogo />
        <h1 className="mt-6 text-xl font-black text-white">التحقق من التقرير</h1>
        {title && <p className="mt-2 text-sm font-semibold text-[#d6a84f]">{decodeURIComponent(title)}</p>}
        {id && (
          <p className="mt-2 text-xs text-white/50">
            رقم التقرير: <span className="font-mono" dir="ltr">{id}</span>
          </p>
        )}
        <p className="mt-4 text-sm leading-relaxed text-white/50">
          مستند تقرير رسمي صادر من baraa raed. للحصول على النسخة الكاملة والبيانات التفصيلية، استخدم حساب
          موظف مخوّل.
        </p>
        <Link href="/login" className="mt-6 inline-block rounded-xl bg-[#d6a84f] px-6 py-3 text-sm font-bold text-black">
          دخول الموظفين
        </Link>
      </div>
    </div>
  );
}
