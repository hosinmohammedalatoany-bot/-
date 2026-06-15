import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "معرض السيارات | براء رائد",
  description: "تصفح السيارات المتوفرة للبيع في معرض براء رائد لمعارض السيارات."
};

export default function ShowroomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#0a0a0c] text-white">
      {children}
    </div>
  );
}
