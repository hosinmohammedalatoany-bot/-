import type { Vehicle } from "@/lib/domain";

export type VehicleApiRecord = Record<string, unknown>;

const statusFromApi: Record<string, Vehicle["status"]> = {
  available: "available",
  reserved: "reserved",
  sold: "sold",
  maintenance: "maintenance",
  transferred: "maintenance",
  not_ready: "not-ready"
};

const statusToApi: Record<Vehicle["status"], string> = {
  available: "available",
  reserved: "reserved",
  sold: "sold",
  maintenance: "maintenance",
  "not-ready": "not_ready"
};

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export function vehicleFromApi(row: VehicleApiRecord): Vehicle {
  const statusKey = String(row.status ?? "available");
  return {
    id: String(row.id),
    internalNumber: String(row.internal_number ?? ""),
    vin: String(row.vin ?? ""),
    plateNumber: String(row.plate_number ?? ""),
    manufacturer: String(row.manufacturer ?? ""),
    model: String(row.model ?? ""),
    trim: String(row.trim ?? ""),
    year: num(row.year),
    exteriorColor: String(row.exterior_color ?? ""),
    interiorColor: String(row.interior_color ?? ""),
    fuelType: String(row.fuel_type ?? ""),
    transmission: String(row.transmission ?? ""),
    mileage: num(row.mileage),
    purchasePrice: num(row.purchase_price),
    salePrice: num(row.sale_price),
    minimumSalePrice: num(row.minimum_sale_price),
    maintenanceCost: num(row.maintenance_cost),
    transportationCost: num(row.transportation_cost),
    status: statusFromApi[statusKey] ?? "available",
    branch: String(row.branch ?? row.branch_name ?? ""),
    supplier: String(row.supplier ?? ""),
    photos: num(row.photos),
    documents: num(row.documents),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString())
  };
}

export function vehicleToApi(input: {
  internalNumber: string;
  vin: string;
  plateNumber: string;
  manufacturer: string;
  model: string;
  trim: string;
  year: number;
  exteriorColor: string;
  interiorColor: string;
  fuelType: string;
  transmission: string;
  mileage: number;
  purchasePrice: number;
  salePrice: number;
  minimumSalePrice: number;
  maintenanceCost: number;
  transportationCost: number;
  branch: string;
  supplier: string;
  status?: Vehicle["status"];
}) {
  return {
    internal_number: input.internalNumber,
    vin: input.vin,
    plate_number: input.plateNumber,
    manufacturer: input.manufacturer,
    model: input.model,
    trim: input.trim,
    year: input.year,
    exterior_color: input.exteriorColor,
    interior_color: input.interiorColor,
    fuel_type: input.fuelType,
    transmission: input.transmission,
    mileage: input.mileage,
    purchase_price: input.purchasePrice,
    sale_price: input.salePrice,
    minimum_sale_price: input.minimumSalePrice,
    maintenance_cost: input.maintenanceCost,
    transportation_cost: input.transportationCost,
    branch: input.branch,
    supplier: input.supplier,
    ...(input.status ? { status: statusToApi[input.status] } : {})
  };
}
