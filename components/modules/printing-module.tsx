"use client";

import { useMemo } from "react";
import { ar } from "@/lib/i18n/ar";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ModulePage } from "@/components/modules/module-page";
import { EmptyState } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { formatDateTime } from "@/lib/utils";

export function PrintingModule() {
  const printedDocuments = useShowroomStore((s) => s.printedDocuments);
  const invoices = useShowroomStore((s) => s.invoices);
  const recordPrint = useShowroomStore((s) => s.recordPrint);

  const reportHtml = buildTableReportHtml(
    "سجل الطباعة",
    ["نوع المستند", "رقم المستند", "الفرع", "المرات", "المستخدم", "التاريخ"],
    printedDocuments.map((p) => [
      p.documentType,
      p.documentNumber,
      p.branch,
      String(p.printCount),
      p.actor,
      formatDateTime(p.printedAt)
    ])
  );

  const sampleInvoice = invoices[0];

  return (
    <ModulePage moduleKey="printing">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">مركز الطباعة</h3>
        <p className="mt-1 text-sm text-white/55">
          كل عملية طباعة أو تصدير تُسجّل تلقائياً. استخدم أزرار الطباعة في المبيعات والتقارير والمحاسبة.
        </p>
        {sampleInvoice && (
          <div className="no-print mt-4">
            <PrintToolbar
              title="معاينة فاتورة"
              printHtmlBody={buildTableReportHtml("فاتورة تجريبية", ["البند", "القيمة"], [
                ["رقم الفاتورة", sampleInvoice.id],
                ["الإجمالي", String(sampleInvoice.total)]
              ])}
              csvFilename="print-log.csv"
              csvHeaders={["نوع", "رقم", "الفرع", "مرات", "تاريخ"]}
              csvRows={printedDocuments.map((p) => [
                p.documentType,
                p.documentNumber,
                p.branch,
                String(p.printCount),
                formatDateTime(p.printedAt)
              ])}
              onPrinted={() => recordPrint("فاتورة", sampleInvoice.id)}
            />
          </div>
        )}
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-white">سجل المستندات المطبوعة</h3>
          <PrintToolbar title="سجل الطباعة" printHtmlBody={reportHtml} />
        </div>
        {printedDocuments.length === 0 ? (
          <EmptyState title={ar.noData} hint="لم تُسجّل طباعة بعد. اطبع من قسم المبيعات أو التقارير." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/55">
                  <th className="p-2 text-right">النوع</th>
                  <th className="p-2 text-right">الرقم</th>
                  <th className="p-2 text-right">الفرع</th>
                  <th className="p-2 text-right">مرات الطباعة</th>
                  <th className="p-2 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {printedDocuments.map((p) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="p-2">{p.documentType}</td>
                    <td className="p-2">{p.documentNumber}</td>
                    <td className="p-2">{p.branch}</td>
                    <td className="p-2">{p.printCount}</td>
                    <td className="p-2">{formatDateTime(p.printedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="luxury-panel rounded-[2rem] p-5 text-sm text-white/65">
        <h3 className="font-bold text-white">صلاحيات الطباعة</h3>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>{ar.permissions.printInvoices}</li>
          <li>{ar.permissions.printContracts}</li>
          <li>{ar.permissions.printReports}</li>
          <li>{ar.permissions.exportPdf}</li>
          <li>{ar.permissions.exportExcel}</li>
        </ul>
        <p className="mt-3 text-white/45">اضبط الصلاحيات من قسم «المستخدمون والصلاحيات».</p>
      </section>
    </ModulePage>
  );
}
