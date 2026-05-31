"use client";

import { useMemo, useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ModulePage } from "@/components/modules/module-page";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { EmptyState, SecondaryButton, StatusBadge, inputClass } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { formatCurrency } from "@/lib/utils";
import type { Vehicle } from "@/lib/domain";

const statusLabels: Record<Vehicle["status"], string> = {
  available: ar.vehicleStatus.available,
  reserved: ar.vehicleStatus.reserved,
  sold: ar.vehicleStatus.sold,
  maintenance: ar.vehicleStatus.maintenance,
  "not-ready": ar.vehicleStatus["not-ready"]
};

export function InventoryModule() {
  const vehicles = useShowroomStore((s) => s.vehicles);
  const deleteVehicle = useShowroomStore((s) => s.deleteVehicle);
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState("all");
  const [manufacturer, setManufacturer] = useState("all");

  const branches = useMemo(() => [...new Set(vehicles.map((v) => v.branch))], [vehicles]);
  const manufacturers = useMemo(() => [...new Set(vehicles.map((v) => v.manufacturer))], [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (branch !== "all" && v.branch !== branch) return false;
      if (status !== "all" && v.status !== status) return false;
      if (manufacturer !== "all" && v.manufacturer !== manufacturer) return false;
      return true;
    });
  }, [vehicles, branch, status, manufacturer]);

  const stagnant = filtered.filter((v) => {
    if (v.status !== "available") return false;
    const ageMs = new Date().getTime() - new Date(v.createdAt).getTime();
    return ageMs > 90 * 86400000;
  });

  const reportHtml = buildTableReportHtml(
    "تقرير المخزون",
    ["الرقم", "المركبة", "الفرع", "الحالة", "التكلفة", "الربح المتوقع"],
    filtered.map((v) => {
      const profit = v.salePrice - v.purchasePrice - v.maintenanceCost - v.transportationCost;
      return [
        v.internalNumber,
        `${v.manufacturer} ${v.model}`,
        v.branch,
        statusLabels[v.status],
        formatCurrency(v.purchasePrice + v.maintenanceCost + v.transportationCost),
        formatCurrency(profit)
      ];
    })
  );

  return (
    <ModulePage moduleKey="inventory">
      <section className="luxury-panel rounded-[2rem] p-5">
        <div className="flex flex-wrap gap-3">
          <select className={inputClass} value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="all">كل الفروع</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">كل الحالات</option>
            {Object.entries(statusLabels).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <select className={inputClass} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)}>
            <option value="all">كل الشركات</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <SecondaryButton
            onClick={() => {
              setBranch("all");
              setStatus("all");
              setManufacturer("all");
            }}
          >
            {ar.resetFilter}
          </SecondaryButton>
        </div>
        <p className="mt-3 text-sm text-white/55">
          سيارات راكدة (أكثر من 90 يوماً ومتوفرة): <strong className="text-amber-200">{stagnant.length}</strong>
        </p>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <PrintToolbar
          title="مخزون"
          printHtmlBody={reportHtml}
          csvFilename="inventory.csv"
          csvHeaders={["الرقم", "المركبة", "الفرع", "الحالة"]}
          csvRows={filtered.map((v) => [v.internalNumber, `${v.manufacturer} ${v.model}`, v.branch, statusLabels[v.status]])}
        />
        <div className="mt-4 overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState title={ar.noData} />
          ) : (
            <table className="w-full min-w-[800px] text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="py-2 text-start">الرقم</th>
                  <th className="text-start">المركبة</th>
                  <th className="text-start">الفرع</th>
                  <th className="text-start">الحالة</th>
                  <th className="text-start">التكلفة</th>
                  <th className="text-start">سعر البيع</th>
                  <th className="text-start">{ar.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td className="py-3 font-semibold">{v.internalNumber}</td>
                    <td>
                      {v.manufacturer} {v.model} ({v.year})
                    </td>
                    <td>{v.branch}</td>
                    <td>
                      <StatusBadge status={statusLabels[v.status]} />
                    </td>
                    <td>{formatCurrency(v.purchasePrice + v.maintenanceCost + v.transportationCost)}</td>
                    <td>{formatCurrency(v.salePrice)}</td>
                    <td className="py-3">
                      <DeleteRowButton
                        onConfirm={() => {
                          const result = deleteVehicle(v.id);
                          if (!result.ok) window.alert(result.message);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </ModulePage>
  );
}
