"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import {
  AlertTriangle,
  BadgeDollarSign,
  Car,
  CheckCircle2,
  PackageCheck,
  Receipt,
  UserRoundPlus,
  Users
} from "lucide-react";
import { ar } from "@/lib/i18n/ar";
import { useShowroomMetrics } from "@/hooks/use-showroom-metrics";
import { useShowroomStore } from "@/lib/offline-store";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function DashboardModule() {
  const metrics = useShowroomMetrics();
  const syncStatus = useShowroomStore((s) => s.syncStatus);
  const pendingOperations = useShowroomStore((s) => s.pendingOperations);
  const lastSyncAt = useShowroomStore((s) => s.lastSyncAt);
  const auditEvents = useShowroomStore((s) => s.auditEvents);

  const dashboardPrintHtml = useMemo(
    () =>
      buildTableReportHtml(
        "تقرير لوحة التحكم التنفيذية",
        ["المؤشر", "القيمة"],
        [
          ["السيارات المتوفرة", String(metrics.available)],
          ["السيارات المباعة", String(metrics.sold)],
          ["السيارات المحجوزة", String(metrics.reserved)],
          ["العملاء", String(metrics.customerCount)],
          ["العملاء المحتملون", String(metrics.leadCount)],
          ["إجمالي المبيعات", formatCurrency(metrics.totalSales)],
          ["إجمالي المصروفات", formatCurrency(metrics.totalExpenses)],
          ["صافي الربح", formatCurrency(metrics.actualProfit)],
          ["قيمة المخزون", formatCurrency(metrics.inventoryValue)],
          ["أقساط اليوم", String(metrics.todaysInstallments)],
          ["أقساط متأخرة", String(metrics.overdueInstallments)],
          ["حجوزات اليوم", String(metrics.todaysReservations)]
        ],
        [
          { label: "حالة المزامنة", value: syncStatus },
          { label: "عمليات معلّقة", value: String(pendingOperations.length) }
        ],
        { periodLabel: "لقطة فورية عند الطباعة" }
      ),
    [metrics, syncStatus, pendingOperations.length]
  );

  const cards: Array<[string, string | number, React.ReactNode]> = [
    ["السيارات المتوفرة", metrics.available, <Car key="a" className="h-5 w-5" />],
    ["السيارات المباعة", metrics.sold, <Receipt key="b" className="h-5 w-5" />],
    ["السيارات المحجوزة", metrics.reserved, <CheckCircle2 key="c" className="h-5 w-5" />],
    ["العملاء", metrics.customerCount, <Users key="d" className="h-5 w-5" />],
    ["العملاء المحتملون", metrics.leadCount, <UserRoundPlus key="e" className="h-5 w-5" />],
    ["إجمالي المبيعات", metrics.formatted.totalSales, <Receipt key="f" className="h-5 w-5" />],
    ["إجمالي المصروفات", metrics.formatted.totalExpenses, <PackageCheck key="g" className="h-5 w-5" />],
    ["الأرباح المتوقعة", metrics.formatted.expectedProfit, <BadgeDollarSign key="h" className="h-5 w-5" />],
    ["أقساط اليوم", metrics.todaysInstallments, <BadgeDollarSign key="i" className="h-5 w-5" />],
    ["أقساط متأخرة", metrics.overdueInstallments, <AlertTriangle key="j" className="h-5 w-5" />],
    ["حجوزات اليوم", metrics.todaysReservations, <CheckCircle2 key="k" className="h-5 w-5" />],
    ["قيمة المخزون", metrics.formatted.inventoryValue, <Car key="l" className="h-5 w-5" />]
  ];

  return (
    <div className="space-y-5">
      <section className="luxury-panel rounded-[2rem] p-6">
        <p className="text-sm text-[#d6a84f]">{ar.dashboard}</p>
        <h2 className="mt-2 text-3xl font-black text-white">{ar.appFullName}</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          ملخص تنفيذي فقط — اختر قسماً من القائمة الجانبية لإدارة السيارات والعملاء والمبيعات والتقارير.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PrintToolbar title="لوحة التحكم" printHtmlBody={dashboardPrintHtml} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="rounded-xl bg-white/5 px-3 py-1">
            {ar.syncStatus}: {syncStatus === "online" ? ar.online : syncStatus === "syncing" ? ar.syncing : ar.offline}
          </span>
          <span className="rounded-xl bg-white/5 px-3 py-1">
            {ar.pendingOps}: {pendingOperations.length}
          </span>
          <span className="rounded-xl bg-white/5 px-3 py-1">
            {ar.lastSync}: {lastSyncAt ? formatDateTime(lastSyncAt) : "—"}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, icon]) => (
          <motion.article
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="luxury-panel rounded-3xl p-5"
          >
            <div className="flex items-center justify-between text-[#d6a84f]">{icon}</div>
            <p className="mt-4 text-sm text-white/55">{label}</p>
            <p className="mt-2 text-2xl font-black text-white">{value}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="luxury-panel rounded-[2rem] p-5">
          <h3 className="font-bold text-white">تنبيهات مهمة</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/65">
            {metrics.overdueInstallments > 0 && (
              <li className="text-amber-200">يوجد {metrics.overdueInstallments} قسط متأخر يحتاج متابعة.</li>
            )}
            {pendingOperations.length > 0 && (
              <li>عمليات معلقة للمزامنة: {pendingOperations.length}</li>
            )}
            {syncStatus === "offline" && <li className="text-red-200">أنت غير متصل — البيانات تُحفظ محلياً.</li>}
            {metrics.overdueInstallments === 0 && pendingOperations.length === 0 && syncStatus === "online" && (
              <li className="text-emerald-200">لا توجد تنبيهات حرجة حالياً.</li>
            )}
          </ul>
        </div>
        <div className="luxury-panel rounded-[2rem] p-5">
          <h3 className="font-bold text-white">آخر العمليات</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            {auditEvents.slice(0, 8).map((event) => (
              <li key={event.id}>
                <span className="text-white/80">{event.action}</span> — {event.target}
                <span className="block text-xs text-white/35">{formatDateTime(event.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
