import type { Customer, Invoice, Reservation, Vehicle } from "@/lib/domain";

export interface DuplicateCheckResult {
  ok: boolean;
  field?: string;
  message?: string;
}

export function checkDuplicateVin(vehicles: Vehicle[], vin: string, excludeId?: string): DuplicateCheckResult {
  const normalized = vin.trim().toUpperCase();
  const exists = vehicles.some((v) => v.vin.toUpperCase() === normalized && v.id !== excludeId);
  return exists
    ? { ok: false, field: "vin", message: "رقم الشاصي (VIN) مستخدم مسبقاً." }
    : { ok: true };
}

export function checkDuplicateCustomerPhone(customers: Customer[], phone: string, excludeId?: string): DuplicateCheckResult {
  const normalized = phone.replace(/\s+/g, "");
  const exists = customers.some((c) => c.phone.replace(/\s+/g, "") === normalized && c.id !== excludeId);
  return exists
    ? { ok: false, field: "phone", message: "رقم الهاتف مسجل لعميل آخر." }
    : { ok: true };
}

export function checkVehicleAlreadySold(vehicles: Vehicle[], vehicleId: string): DuplicateCheckResult {
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  if (vehicle?.status === "sold") {
    return { ok: false, message: "لا يمكن بيع نفس السيارة مرتين." };
  }
  return { ok: true };
}

export function checkDuplicateInvoiceNumber(invoices: Invoice[], invoiceNumber: string): DuplicateCheckResult {
  const exists = invoices.some((inv) => inv.id === invoiceNumber);
  return exists ? { ok: false, message: "رقم الفاتورة مكرر." } : { ok: true };
}

export function checkDuplicateReservation(
  reservations: Reservation[],
  vehicleId: string,
  expiresAt: string,
  excludeId?: string
): DuplicateCheckResult {
  const target = new Date(expiresAt).toDateString();
  const exists = reservations.some(
    (r) => r.vehicleId === vehicleId && new Date(r.expiresAt).toDateString() === target && r.id !== excludeId
  );
  return exists
    ? { ok: false, message: "يوجد حجز لنفس السيارة في نفس اليوم." }
    : { ok: true };
}

export function checkDuplicateReceiptNumber(existing: string[], receiptNumber: string): DuplicateCheckResult {
  return existing.includes(receiptNumber)
    ? { ok: false, message: "رقم الإيصال مكرر." }
    : { ok: true };
}
