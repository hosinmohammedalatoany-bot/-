import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default async function VerifyInvoicePage({
  params
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const decoded = decodeURIComponent(number);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="luxury-panel rounded-[2rem] p-8 text-center">
        <BrandLogo />
        <h1 className="mt-6 text-xl font-black text-white">التحقق من الفاتورة</h1>
        <p className="mt-4 text-sm text-white/60">
          رقم المستند: <span className="font-mono text-[#d6a84f]" dir="ltr">{decoded}</span>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/50">
          تم مسح رمز QR الخاص بفاتورة صادرة من نظام baraa raed لإدارة معارض السيارات. للاطلاع على التفاصيل
          الكاملة أو التأكد من صحة البيانات، تواصل مع المعرض أو سجّل دخولك كموظف مخوّل.
        </p>
        <Link href="/login" className="mt-6 inline-block rounded-xl bg-[#d6a84f] px-6 py-3 text-sm font-bold text-black">
          دخول الموظفين
        </Link>
      </div>
    </div>
  );
}
