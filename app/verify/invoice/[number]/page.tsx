import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type PublicInvoice = {
  valid: boolean;
  document_number: string;
  status: string;
  issued_at: string;
  net_total: string;
  payment_type: string;
  vehicle_label: string;
  customer_name: string;
  branch: string;
};

const statusLabel: Record<string, string> = {
  issued: "فاتورة صادرة ومسجّلة",
  revised: "فاتورة معدّلة",
  draft: "مسودة",
  cancelled: "ملغاة"
};

const paymentLabel: Record<string, string> = {
  cash: "نقد",
  "bank-transfer": "تحويل بنكي",
  installment: "تقسيط",
  mixed: "مختلط"
};

async function loadInvoice(number: string): Promise<PublicInvoice | null> {
  const encoded = encodeURIComponent(number);
  const base =
    process.env.DJANGO_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "";
  if (base) {
    try {
      const res = await fetch(
        `${base.replace(/\/$/, "")}/api/sales/invoices/verify/${encoded}/`,
        { next: { revalidate: 60 } }
      );
      if (res.ok) return (await res.json()) as PublicInvoice;
    } catch {
      /* fall through */
    }
  }
  return null;
}

export default async function VerifyInvoicePage({
  params
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const decoded = decodeURIComponent(number);
  const invoice = await loadInvoice(decoded);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="luxury-panel rounded-[2rem] p-8 text-center">
        <BrandLogo />
        <h1 className="mt-6 text-xl font-black text-white">التحقق من الفاتورة</h1>
        {invoice ? (
          <>
            <p className="mt-4 text-sm text-white/60">
              رقم المستند:{" "}
              <span className="font-mono text-[#d6a84f]" dir="ltr">
                {invoice.document_number}
              </span>
            </p>
            <p
              className={`mt-4 text-sm font-semibold ${
                invoice.valid ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {invoice.valid
                ? statusLabel[invoice.status] ?? "مستند مسجّل"
                : "المستند غير صالح أو ملغى"}
            </p>
            <p className="mt-3 text-sm text-white/70">{invoice.vehicle_label}</p>
            <p className="mt-1 text-sm text-white/50">
              العميل: {invoice.customer_name}
            </p>
            {invoice.branch && (
              <p className="mt-1 text-sm text-white/50">الفرع: {invoice.branch}</p>
            )}
            <p className="mt-2 text-sm text-white/50">
              طريقة الدفع: {paymentLabel[invoice.payment_type] ?? invoice.payment_type}
            </p>
            <p className="mt-2 text-base text-[#d6a84f]">
              الصافي: {formatCurrency(Number(invoice.net_total))}
            </p>
            <p className="mt-1 text-xs text-white/40">
              {formatDateTime(invoice.issued_at)}
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-white/60">
              رقم المستند:{" "}
              <span className="font-mono text-[#d6a84f]" dir="ltr">
                {decoded}
              </span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              لم يتم العثور على فاتورة بهذا الرقم في سجلات النظام.
            </p>
          </>
        )}
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-[#d6a84f] px-6 py-3 text-sm font-bold text-black"
        >
          دخول الموظفين
        </Link>
      </div>
    </div>
  );
}
