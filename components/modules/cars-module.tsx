"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { QrCode } from "lucide-react";
import { ar } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { EmptyState, Field, PrimaryButton, SecondaryButton, StatusBadge, inputClass } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { vehicleSchema, type VehicleInput } from "@/lib/validation";
import { formatCurrency } from "@/lib/utils";
import type { Vehicle } from "@/lib/domain";

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
  const vehicles = useShowroomStore((s) => s.vehicles);
  const addVehicle = useShowroomStore((s) => s.addVehicle);
  const updateVehicleStatus = useShowroomStore((s) => s.updateVehicleStatus);
  const { log, items } = useActionLog();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const form = useForm<VehicleInput>({ defaultValues: emptyVehicle });
  const [loading, setLoading] = useState(false);

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
    const result = addVehicle(parsed.data);
    if (result.ok) {
      log(`تمت إضافة السيارة ${result.vehicle.internalNumber}`);
      form.reset(emptyVehicle);
    } else {
      log(result.message);
    }
    setLoading(false);
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
        </div>

        {filtered.length === 0 ? (
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
                            const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(v.vin)}`;
                            window.open(url, "_blank");
                            log(`QR للسيارة ${v.internalNumber}`);
                          }}
                        >
                          <QrCode className="h-3 w-3" />
                        </SecondaryButton>
                        {v.status !== "sold" && (
                          <SecondaryButton onClick={() => updateVehicleStatus(v.id, "reserved")}>حجز</SecondaryButton>
                        )}
                        {v.status !== "sold" && (
                          <SecondaryButton onClick={() => updateVehicleStatus(v.id, "available")}>متوفرة</SecondaryButton>
                        )}
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
