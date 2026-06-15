"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ModulePage } from "@/components/modules/module-page";
import { EmptyState, PrimaryButton } from "@/components/ui/primitives";
import { canUsePermission, type ClientUser } from "@/lib/client-permissions";
import { reportFromApi, type ReportPayload } from "@/lib/reports-map";
import { useShowroomMetrics } from "@/hooks/use-showroom-metrics";
import { useShowroomStore } from "@/lib/offline-store";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const apiReportsEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

const REPORT_IDS = [
  "sales",
  "profit",
  "inventory",
  "sold",
  "reserved",
  "installments",
  "customers",
  "branches",
  "employees"
] as const;

function readSessionUser(): ClientUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("br_user");
    return raw ? (JSON.parse(raw) as ClientUser) : null;
  } catch {
    return null;
  }
}

function offlineReports(
  metrics: ReturnType<typeof useShowroomMetrics>,
  vehicles: ReturnType<typeof useShowroomStore.getState>["vehicles"],
  customers: ReturnType<typeof useShowroomStore.getState>["customers"],
  installments: ReturnType<typeof useShowroomStore.getState>["installments"],
  invoices: ReturnType<typeof useShowroomStore.getState>["invoices"]
): ReportPayload[] {
  const overdue = installments.filter(
    (i) =>
      i.status === "overdue" ||
      (i.status === "pending" && i.paidAmount < i.amount)
  );
  const sold = vehicles.filter((v) => v.status === "sold");
  const available = vehicles.filter((v) => v.status === "available");
  const reserved = vehicles.filter((v) => v.status === "reserved");

  return [
    {
      id: "sales",
      title: "تقرير المبيعات",
      headers: ["رقم الفاتورة", "الإجمالي", "الخصم", "الضريبة", "التاريخ"],
      rows: invoices.map((inv) => [
        inv.id,
        formatCurrency(inv.total),
        formatCurrency(inv.discount),
        formatCurrency(inv.tax),
        formatDateTime(inv.createdAt)
      ])
    },
    {
      id: "profit",
      title: "الأرباح والخسائر",
      headers: ["البند", "القيمة"],
      rows: [
        ["إجمالي المبيعات", metrics.formatted.totalSales],
        ["المصروفات", metrics.formatted.totalExpenses],
        ["صافي الربح", metrics.formatted.actualProfit]
      ]
    },
    {
      id: "inventory",
      title: "تقرير السيارات المتوفرة",
      headers: ["الرقم", "المركبة", "الفرع", "الحالة", "سعر البيع"],
      rows: available.map((v) => [
        v.internalNumber,
        `${v.manufacturer} ${v.model}`,
        v.branch,
        ar.vehicleStatus[v.status],
        formatCurrency(v.salePrice)
      ])
    },
    {
      id: "sold",
      title: "تقرير السيارات المباعة",
      headers: ["الرقم", "المركبة", "VIN"],
      rows: sold.map((v) => [v.internalNumber, `${v.manufacturer} ${v.model}`, v.vin])
    },
    {
      id: "reserved",
      title: "تقرير الحجوزات",
      headers: ["الرقم", "المركبة", "الفرع"],
      rows: reserved.map((v) => [
        v.internalNumber,
        `${v.manufacturer} ${v.model}`,
        v.branch
      ])
    },
    {
      id: "installments",
      title: "تقرير الأقساط المتأخرة",
      headers: ["القسط", "المبلغ", "المدفوع", "الحالة", "الاستحقاق"],
      rows: overdue.map((i) => [
        i.id,
        formatCurrency(i.amount),
        formatCurrency(i.paidAmount),
        i.status,
        formatDateTime(i.dueDate)
      ])
    },
    {
      id: "customers",
      title: "تقرير العملاء",
      headers: ["الاسم", "الهاتف", "المشتريات", "الرصيد"],
      rows: customers.map((c) => [
        c.name,
        c.phone,
        String(c.purchases),
        formatCurrency(c.balance)
      ])
    },
    {
      id: "branches",
      title: "تقرير الفروع",
      headers: ["الفرع", "ملاحظة"],
      rows: [["الفرع الرئيسي", "يتطلب ربط API لتفاصيل الفروع"]]
    },
    {
      id: "employees",
      title: "تقرير أداء الموظفين",
      headers: ["ملاحظة"],
      rows: [["يتطلب ربط API لإحصاء المبيعات حسب الموظف"]]
    }
  ];
}

function reportToView(report: ReportPayload) {
  const html = buildTableReportHtml(report.title, report.headers, report.rows);
  const csv = {
    headers: report.headers,
    rows: report.rows
  };
  return { id: report.id, title: report.title, html, csv, payload: report };
}

export function ReportsModule() {
  const metrics = useShowroomMetrics();
  const vehicles = useShowroomStore((s) => s.vehicles);
  const customers = useShowroomStore((s) => s.customers);
  const installments = useShowroomStore((s) => s.installments);
  const invoices = useShowroomStore((s) => s.invoices);
  const recordPrint = useShowroomStore((s) => s.recordPrint);

  const [sessionUser] = useState(readSessionUser);
  const [apiReports, setApiReports] = useState<ReportPayload[] | null>(null);
  const [fetching, setFetching] = useState(apiReportsEnabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const canExportExcel = canUsePermission(sessionUser, "export.excel");

  const loadReports = useCallback(async () => {
    if (!apiReportsEnabled) return;
    setFetching(true);
    setLoadError(null);
    try {
      const results: ReportPayload[] = [];
      for (const id of REPORT_IDS) {
        const res = await fetch(`/api/reports/data?type=${encodeURIComponent(id)}`, {
          credentials: "include"
        });
        const data = (await res.json()) as { report?: unknown; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? `تعذر تحميل تقرير ${id}`);
        }
        if (data.report) {
          results.push(reportFromApi(data.report as Record<string, unknown>));
        }
      }
      setApiReports(results);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "تعذر تحميل التقارير");
      setApiReports(null);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadReports();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadReports]);

  const reports = useMemo(() => {
    const source =
      apiReportsEnabled && apiReports !== null
        ? apiReports
        : offlineReports(metrics, vehicles, customers, installments, invoices);
    return source.map(reportToView);
  }, [apiReports, metrics, vehicles, customers, installments, invoices]);

  const handleApiCsvExport = async (reportId: string) => {
    if (!canExportExcel) return;
    setExportingId(reportId);
    try {
      const res = await fetch(
        `/api/reports/export?type=${encodeURIComponent(reportId)}&export_format=csv`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "تعذر التصدير");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportId}-report.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "فشل التصدير");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <ModulePage moduleKey="reports">
      {apiReportsEnabled ? (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <PrimaryButton type="button" onClick={() => void loadReports()} disabled={fetching}>
            {fetching ? "جاري التحديث…" : "تحديث التقارير"}
          </PrimaryButton>
          {loadError ? (
            <p className="text-sm text-red-300" role="alert">
              {loadError}
            </p>
          ) : null}
        </div>
      ) : null}

      {fetching && apiReports === null && apiReportsEnabled ? (
        <EmptyState title="جاري تحميل التقارير من الخادم…" />
      ) : (
        <section className="space-y-4">
          {reports.map((report) => (
            <article key={report.id} className="luxury-panel rounded-[2rem] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white">{report.title}</h3>
                  {report.payload.row_count !== undefined ? (
                    <p className="mt-1 text-sm text-white/60">
                      {report.payload.row_count} صف
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {apiReportsEnabled && canExportExcel ? (
                    <PrimaryButton
                      type="button"
                      disabled={exportingId === report.id}
                      onClick={() => void handleApiCsvExport(report.id)}
                    >
                      {exportingId === report.id ? "جاري التصدير…" : "تصدير Excel (CSV)"}
                    </PrimaryButton>
                  ) : null}
                  <PrintToolbar
                    title={report.title}
                    printHtmlBody={report.html}
                    csvFilename={`${report.id}-report.csv`}
                    csvHeaders={report.csv.headers}
                    csvRows={report.csv.rows}
                    onPrinted={() => recordPrint("تقرير", `REP-${report.id}`)}
                  />
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </ModulePage>
  );
}
