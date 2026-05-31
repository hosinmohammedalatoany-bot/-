"use client";

import { useMemo } from "react";
import { ar } from "@/lib/i18n/ar";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ModulePage } from "@/components/modules/module-page";
import { useShowroomMetrics } from "@/hooks/use-showroom-metrics";
import { useShowroomStore } from "@/lib/offline-store";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function ReportsModule() {
  const metrics = useShowroomMetrics();
  const vehicles = useShowroomStore((s) => s.vehicles);
  const customers = useShowroomStore((s) => s.customers);
  const installments = useShowroomStore((s) => s.installments);
  const invoices = useShowroomStore((s) => s.invoices);
  const recordPrint = useShowroomStore((s) => s.recordPrint);

  const reports = useMemo(() => {
    const overdue = installments.filter((i) => i.status === "overdue" || (i.status === "pending" && i.paidAmount < i.amount));
    const sold = vehicles.filter((v) => v.status === "sold");
    const available = vehicles.filter((v) => v.status === "available");
    const reserved = vehicles.filter((v) => v.status === "reserved");

    return [
      {
        id: "sales",
        title: "تقرير المبيعات",
        html: buildTableReportHtml(
          "تقرير المبيعات",
          ["رقم الفاتورة", "الإجمالي", "الخصم", "الضريبة", "التاريخ"],
          invoices.map((inv) => [
            inv.id,
            formatCurrency(inv.total),
            formatCurrency(inv.discount),
            formatCurrency(inv.tax),
            formatDateTime(inv.createdAt)
          ])
        ),
        csv: {
          headers: ["رقم", "إجمالي", "خصم", "ضريبة", "تاريخ"],
          rows: invoices.map((inv) => [
            inv.id,
            String(inv.total),
            String(inv.discount),
            String(inv.tax),
            inv.createdAt
          ])
        }
      },
      {
        id: "profit",
        title: "الأرباح والخسائر",
        html: buildTableReportHtml("الأرباح والخسائر", ["البند", "القيمة"], [
          ["إجمالي المبيعات", metrics.formatted.totalSales],
          ["المصروفات", metrics.formatted.totalExpenses],
          ["صافي الربح", metrics.formatted.actualProfit]
        ])
      },
      {
        id: "inventory",
        title: "تقرير المخزون",
        html: buildTableReportHtml(
          "تقرير السيارات المتوفرة",
          ["الرقم", "المركبة", "الفرع", "الحالة", "سعر البيع"],
          available.map((v) => [
            v.internalNumber,
            `${v.manufacturer} ${v.model}`,
            v.branch,
            ar.vehicleStatus[v.status],
            formatCurrency(v.salePrice)
          ])
        )
      },
      {
        id: "sold",
        title: "السيارات المباعة",
        html: buildTableReportHtml(
          "تقرير السيارات المباعة",
          ["الرقم", "المركبة", "VIN"],
          sold.map((v) => [v.internalNumber, `${v.manufacturer} ${v.model}`, v.vin])
        )
      },
      {
        id: "reserved",
        title: "السيارات المحجوزة",
        html: buildTableReportHtml(
          "تقرير الحجوزات",
          ["الرقم", "المركبة", "الفرع"],
          reserved.map((v) => [v.internalNumber, `${v.manufacturer} ${v.model}`, v.branch])
        )
      },
      {
        id: "installments",
        title: "الأقساط المتأخرة",
        html: buildTableReportHtml(
          "تقرير الأقساط المتأخرة",
          ["القسط", "المبلغ", "المدفوع", "الحالة", "الاستحقاق"],
          overdue.map((i) => [
            i.id,
            formatCurrency(i.amount),
            formatCurrency(i.paidAmount),
            i.status,
            formatDateTime(i.dueDate)
          ])
        )
      },
      {
        id: "customers",
        title: "تقرير العملاء",
        html: buildTableReportHtml(
          "تقرير العملاء",
          ["الاسم", "الهاتف", "المشتريات", "الرصيد"],
          customers.map((c) => [c.name, c.phone, String(c.purchases), formatCurrency(c.balance)])
        ),
        csv: {
          headers: ["الاسم", "الهاتف", "مشتريات", "رصيد"],
          rows: customers.map((c) => [c.name, c.phone, String(c.purchases), String(c.balance)])
        }
      }
    ];
  }, [metrics, vehicles, customers, installments, invoices]);

  return (
    <ModulePage moduleKey="reports">
      <section className="space-y-4">
        {reports.map((report) => (
          <article key={report.id} className="luxury-panel rounded-[2rem] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-white">{report.title}</h3>
              <PrintToolbar
                title={report.title}
                printHtmlBody={report.html}
                csvFilename={`${report.id}-report.csv`}
                csvHeaders={report.csv?.headers}
                csvRows={report.csv?.rows}
                onPrinted={() => recordPrint("تقرير", `REP-${report.id}`)}
              />
            </div>
          </article>
        ))}
      </section>
    </ModulePage>
  );
}
