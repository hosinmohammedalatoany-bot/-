"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { QrCode } from "lucide-react";
import { ar } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { EmptyState, Field, PrimaryButton, SecondaryButton, StatusBadge, inputClass } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { vehicleSchema, type VehicleInput } from "@/lib/validation";
import { vehicleVerifyUrl } from "@/lib/document-codes";
import { formatCurrency } from "@/lib/utils";
import type { Vehicle } from "@/lib/domain";
import { vehicleFromApi } from "@/lib/vehicles-map";

const apiVehiclesEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

const emptyVehicle: VehicleInput = {
  internalNumber: "",
  vin: "",
  plateNumber: "",
  manufacturer: "",
  model: "",
  trim: "",
  year: new Date().getFullYear(),
  exteriorColor: "",
  interiorColor: "",
  fuelType: "بنزين",
  transmission: "أوتوماتيك",
  mileage: 0,
  purchasePrice: 0,
  salePrice: 0,
  minimumSalePrice: 0,
  maintenanceCost: 0,
  transportationCost: 0,
  branch: "الفرع الرئيسي",
  supplier: ""
};

const vehicleFields: Array<[keyof VehicleInput, string]> = [
  ["internalNumber", "الرقم الداخلي"],
  ["vin", "VIN"],
  ["plateNumber", "رقم اللوحة"],
  ["manufacturer", "الشركة"],
  ["model", "الموديل"],
  ["trim", "الفئة"],
  ["year", "سنة الصنع"],
  ["exteriorColor", "اللون الخارجي"],
  ["interiorColor", "اللون الداخلي"],
  ["fuelType", "نوع الوقود"],
  ["transmission", "ناقل الحركة"],
  ["mileage", "الكيلومترات"],
  ["purchasePrice", "سعر الشراء"],
  ["salePrice", "سعر البيع"],
  ["minimumSalePrice", "أقل سعر بيع"],
  ["maintenanceCost", "تكلفة الصيانة"],
  ["transportationCost", "تكلفة النقل"],
  ["branch", "الفرع"],
  ["supplier", "المورد"]
];

const statusLabels: Record<Vehicle["status"], string> = {
  available: ar.vehicleStatus.available,
  reserved: ar.vehicleStatus.reserved,
  sold: ar.vehicleStatus.sold,
  maintenance: ar.vehicleStatus.maintenance,
  "not-ready": ar.vehicleStatus["not-ready"]
};

export function CarsModule() {
  const storeVehicles = useShowroomStore((s) => s.vehicles);
  const addVehicleStore = useShowroomStore((s) => s.addVehicle);
  const updateVehicleStatusStore = useShowroomStore((s) => s.updateVehicleStatus);
  const deleteVehicleStore = useShowroomStore((s) => s.deleteVehicle);
  const { log, items } = useActionLog();
  const [apiVehicles, setApiVehicles] = useState<Vehicle[] | null>(null);
  const [fetching, setFetching] = useState(apiVehiclesEnabled);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const form = useForm<VehicleInput>({ defaultValues: emptyVehicle });
  const [loading, setLoading] = useState(false);

  const vehicles = apiVehiclesEnabled && apiVehicles !== null ? apiVehicles : storeVehicles;

  const loadVehicles = useCallback(async () => {
    if (!apiVehiclesEnabled) return;
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        const apiStatus = statusFilter === "not-ready" ? "not_ready" : statusFilter;
        params.set("status", apiStatus);
      }
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/vehicles?${params.toString()}`, { credentials: "include" });
      const data = (await res.json()) as { vehicles?: unknown[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "تعذر تحميل السيارات");
      setApiVehicles(
        (data.vehicles ?? []).map((row) => vehicleFromApi(row as Record<string, unknown>))
      );
    } catch (e) {
      log(e instanceof Error ? e.message : "تعذر تحميل السيارات");
    } finally {
      setFetching(false);
    }
  }, [search, statusFilter, log]);

  useEffect(() => {
    if (!apiVehiclesEnabled) return;
    const timer = window.setTimeout(() => void loadVehicles(), 0);
    return () => window.clearTimeout(timer);
  }, [loadVehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const q = search.trim().toLowerCase();
      const matchQ =
        !q ||
        v.internalNumber.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q) ||
        v.manufacturer.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || v.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [vehicles, search, statusFilter]);

  const reportHtml = buildTableReportHtml(
    "تقرير السيارات",
    ["الرقم", "VIN", "المركبة", "الحالة", "البيع", "الفرع"],
    filtered.map((v) => [
      v.internalNumber,
      v.vin,
      `${v.manufacturer} ${v.model}`,
      statusLabels[v.status],
      formatCurrency(v.salePrice),
      v.branch
    ])
  );

  async function onSubmit(data: VehicleInput) {
    setLoading(true);
    const parsed = vehicleSchema.safeParse(data);
    if (!parsed.success) {
      log(parsed.error.issues[0]?.message ?? "تحقق من البيانات");
      setLoading(false);
      return;
    }
    if (apiVehiclesEnabled) {
      try {
        const res = await fetch("/api/vehicles", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data)
        });
        const body = (await res.json()) as { vehicle?: Vehicle; error?: string };
        if (!res.ok) throw new Error(body.error ?? "تعذر حفظ السيارة");
        log(`تمت إضافة السيارة ${body.vehicle?.internalNumber ?? ""}`);
        form.reset(emptyVehicle);
        await loadVehicles();
      } catch (e) {
        log(e instanceof Error ? e.message : "تعذر حفظ السيارة");
      }
      setLoading(false);
      return;
    }
    const result = addVehicleStore(parsed.data);
    if (result.ok) {
      log(`تمت إضافة السيارة ${result.vehicle.internalNumber}`);
      form.reset(emptyVehicle);
    } else {
      log(result.message);
    }
    setLoading(false);
  }

  async function changeStatus(vehicleId: string, status: Vehicle["status"], label: string) {
    if (apiVehiclesEnabled) {
      try {
        const res = await fetch(`/api/vehicles/${vehicleId}/status`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "تعذر تحديث الحالة");
        log(`تم تحديث حالة ${label}`);
        await loadVehicles();
      } catch (e) {
        log(e instanceof Error ? e.message : "تعذر تحديث الحالة");
      }
      return;
    }
    updateVehicleStatusStore(vehicleId, status);
    log(`تم تحديث الحالة إلى ${label}`);
  }

  async function removeVehicle(vehicle: Vehicle) {
    if (apiVehiclesEnabled) {
      try {
        const res = await fetch(`/api/vehicles/${vehicle.id}`, {
          method: "DELETE",
          credentials: "include"
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "تعذر أرشفة السيارة");
        log(`أُرشفت السيارة ${vehicle.internalNumber}`);
        await loadVehicles();
      } catch (e) {
        log(e instanceof Error ? e.message : "تعذر أرشفة السيارة");
      }
      return;
    }
    const result = deleteVehicleStore(vehicle.id);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    log(`حذف السيارة ${vehicle.internalNumber}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">إدارة السيارات</h2>
          <p className="text-sm text-white/50">إضافة، تعديل الحالة، QR، ومنع تكرار VIN</p>
        </div>
        <PrintToolbar
          title="تقرير-السيارات"
          printHtmlBody={reportHtml}
          csvFilename="baraa-raed-cars.csv"
          csvHeaders={["الرقم", "VIN", "المركبة", "الحالة", "البيع", "الفرع"]}
          csvRows={filtered.map((v) => [
            v.internalNumber,
            v.vin,
            `${v.manufacturer} ${v.model}`,
            v.status,
            v.salePrice,
            v.branch
          ])}
          onPrinted={() => log("تم تسجيل طباعة تقرير السيارات")}
        />
      </div>

      <form className="luxury-panel rounded-[2rem] p-5" onSubmit={form.handleSubmit(onSubmit)}>
        <h3 className="text-lg font-bold">{ar.add} سيارة</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {vehicleFields.map(([name, label]) => (
            <Field key={name} label={label}>
              <input className={inputClass} {...form.register(name)} />
            </Field>
          ))}
        </div>
        <div className="mt-4">
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? ar.loading : "حفظ السيارة"}
          </PrimaryButton>
        </div>
      </form>

      <div className="luxury-panel rounded-[2rem] p-5">
        <div className="flex flex-wrap gap-3">
          <input
            className={inputClass + " max-w-xs"}
            placeholder={ar.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={inputClass + " max-w-[180px]"} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">كل الحالات</option>
            {Object.entries(statusLabels).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <SecondaryButton
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          >
            {ar.resetFilter}
          </SecondaryButton>
          {apiVehiclesEnabled && (
            <SecondaryButton onClick={() => void loadVehicles()} disabled={fetching}>
              {fetching ? ar.loading : "تحديث"}
            </SecondaryButton>
          )}
        </div>

        {fetching && apiVehiclesEnabled ? (
          <p className="mt-6 text-sm text-white/50">{ar.loading}</p>
        ) : filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState title={ar.noData} hint="أضف سيارة جديدة من النموذج أعلاه" />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="p-2 text-start">المركبة</th>
                  <th className="p-2 text-start">VIN</th>
                  <th className="p-2 text-start">الحالة</th>
                  <th className="p-2 text-start">البيع</th>
                  <th className="p-2 text-start">{ar.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b border-white/5">
                    <td className="p-2">
                      <div className="font-semibold text-white">
                        {v.manufacturer} {v.model}
                      </div>
                      <div className="text-xs text-white/40">{v.internalNumber}</div>
                    </td>
                    <td className="p-2 font-mono text-xs" dir="ltr">
                      {v.vin}
                    </td>
                    <td className="p-2">
                      <StatusBadge status={v.status} label={statusLabels[v.status]} />
                    </td>
                    <td className="p-2">{formatCurrency(v.salePrice)}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <SecondaryButton
                          onClick={() => {
                            window.open(vehicleVerifyUrl(v.id), "_blank", "noopener,noreferrer");
                            log(`QR للسيارة ${v.internalNumber}`);
                          }}
                        >
                          <QrCode className="h-3 w-3" />
                        </SecondaryButton>
                        {v.status !== "sold" && (
                          <SecondaryButton onClick={() => void changeStatus(v.id, "reserved", "محجوزة")}>
                            حجز
                          </SecondaryButton>
                        )}
                        {v.status !== "sold" && (
                          <SecondaryButton onClick={() => void changeStatus(v.id, "available", "متوفرة")}>
                            متوفرة
                          </SecondaryButton>
                        )}
                        <DeleteRowButton onConfirm={() => void removeVehicle(v)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {items[0] && (
        <p className="text-xs text-white/40">
          آخر إجراء: {items[0]}
        </p>
      )}
    </div>
  );
}
