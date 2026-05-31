"use client";

import { useMemo } from "react";
import { ar } from "@/lib/i18n/ar";
import {
  buildInstallmentContractPrintHtml,
  buildInvoicePrintHtml,
  buildPaymentReceiptPrintHtml,
  buildSaleContractPrintHtml,
  buildTableReportHtml
} from "@/components/print/document-templates";
import { PrintDocumentActions } from "@/components/print/print-document-actions";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ModulePage } from "@/components/modules/module-page";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { EmptyState, SecondaryButton } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { invoiceToDefaultLineItems } from "@/lib/print-line-items";
import { formatDateTime } from "@/lib/utils";

const SAMPLE_DOC_NO = "INV-000001";

export function PrintingModule() {
  const printedDocuments = useShowroomStore((s) => s.printedDocuments);
  const invoices = useShowroomStore((s) => s.invoices);
  const vehicles = useShowroomStore((s) => s.vehicles);
  const customers = useShowroomStore((s) => s.customers);
  const recordPrint = useShowroomStore((s) => s.recordPrint);
  const deletePrintedDocument = useShowroomStore((s) => s.deletePrintedDocument);

  const sampleRow = useMemo(() => {
    const inv = invoices[0];
    if (!inv) return null;
    const vehicle = vehicles.find((v) => v.id === inv.vehicleId);
    const customer = customers.find((c) => c.id === inv.customerId);
    return { inv, vehicle, customer, docNo: SAMPLE_DOC_NO };
  }, [invoices, vehicles, customers]);

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
    ]),
    [{ label: "إجمالي السجلات", value: String(printedDocuments.length) }]
  );

  const templateSamples = useMemo(() => {
    if (!sampleRow) return [];
    const { inv, vehicle, customer, docNo } = sampleRow;
    return [
      {
        key: "invoice",
        label: "فاتورة بيع",
        getHtml: () =>
          buildInvoicePrintHtml({
            invoiceNumber: docNo,
            invoice: inv,
            vehicle,
            customer
          })
      },
      {
        key: "contract",
        label: "عقد بيع",
        getHtml: () =>
          buildSaleContractPrintHtml({
            contractNumber: docNo.replace(/^INV/, "CNT"),
            invoice: inv,
            vehicle,
            customer
          })
      },
      {
        key: "installment",
        label: "عقد تقسيط",
        getHtml: () =>
          buildInstallmentContractPrintHtml({
            contractNumber: `INST-${docNo}`,
            totalAmount: inv.total - inv.discount + inv.tax,
            customerName: customer?.name,
            downPayment: 0,
            installmentCount: 12
          })
      },
      {
        key: "receipt",
        label: "إيصال دفع",
        getHtml: () =>
          buildPaymentReceiptPrintHtml({
            receiptNumber: `RCP-${docNo}`,
            amount: inv.total,
            payerName: customer?.name,
            reference: docNo,
            note: "معاينة قالب إيصال"
          })
      }
    ];
  }, [sampleRow]);

  return (
    <ModulePage moduleKey="printing">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">مركز الطباعة</h3>
        <p className="mt-1 text-sm text-white/55">
          معاينة قوالب المستندات الرسمية بنفس الهوية المستخدمة في المبيعات والتقارير. سجّل أول فاتورة في
          النظام لتفعيل المعاينة التفصيلية.
        </p>
        {sampleRow ? (
          <div className="no-print mt-4 grid gap-4 md:grid-cols-2">
            {templateSamples.map((t) => (
              <article key={t.key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <h4 className="font-semibold text-amber-100/90">{t.label}</h4>
                {t.key === "invoice" ? (
                  <div className="mt-3">
                    <PrintDocumentActions
                      title={`معاينة ${t.label}`}
                      getHtml={t.getHtml}
                      onPrinted={() => recordPrint(t.label, SAMPLE_DOC_NO)}
                      lineItemsEditor={{
                        initialLineItems: invoiceToDefaultLineItems(sampleRow.inv, sampleRow.vehicle),
                        buildHtml: (items) =>
                          buildInvoicePrintHtml({
                            invoiceNumber: SAMPLE_DOC_NO,
                            invoice: sampleRow.inv,
                            vehicle: sampleRow.vehicle,
                            customer: sampleRow.customer,
                            lineItems: items
                          })
                      }}
                    />
                  </div>
                ) : (
                  <div className="mt-3">
                    <PrintDocumentActions
                      title={`معاينة ${t.label}`}
                      getHtml={t.getHtml}
                      onPrinted={() => recordPrint(t.label, SAMPLE_DOC_NO)}
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/45">أصدر فاتورة من قسم المبيعات لعرض قوالب الفاتورة والعقود هنا.</p>
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
                  <th className="p-2 text-right">{ar.actions}</th>
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
                    <td className="p-2">
                      <DeleteRowButton
                        onConfirm={() => {
                          const result = deletePrintedDocument(p.id);
                          if (!result.ok) window.alert(result.message);
                        }}
                      />
                    </td>
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
        <p className="mt-3 text-white/45">اضبط الشعار والختم وتوقيع المدير من قسم «الإعدادات».</p>
        <SecondaryButton className="mt-3" onClick={() => window.location.assign("/settings")}>
          فتح إعدادات الطباعة
        </SecondaryButton>
      </section>
    </ModulePage>
  );
}
