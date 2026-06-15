import type { Invoice, Reservation } from "@/lib/domain";

export type ReservationApiRecord = Record<string, unknown>;
export type InvoiceApiRecord = Record<string, unknown>;

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

const paymentFromApi: Record<string, Invoice["type"]> = {
  cash: "cash",
  "bank-transfer": "bank-transfer",
  installment: "installment",
  mixed: "mixed"
};

export function reservationFromApi(row: ReservationApiRecord): Reservation {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id ?? ""),
    customerId: String(row.customer_id ?? ""),
    employee: String(row.employee_name ?? ""),
    deposit: num(row.deposit),
    expiresAt: String(row.expires_at ?? new Date().toISOString())
  };
}

export function reservationToApi(input: {
  vehicleId: string;
  customerId: string;
  employee: string;
  deposit: number;
  expiresAt: string;
}) {
  const expires =
    input.expiresAt.includes("T") && !input.expiresAt.endsWith("Z")
      ? new Date(input.expiresAt).toISOString()
      : input.expiresAt;
  return {
    vehicle_id: input.vehicleId,
    customer_id: input.customerId,
    employee_name: input.employee,
    deposit: input.deposit,
    expires_at: expires
  };
}

export function invoiceFromApi(row: InvoiceApiRecord): Invoice {
  const payment = paymentFromApi[String(row.payment_type)] ?? "cash";
  const statusRaw = String(row.status ?? "issued");
  const status =
    statusRaw === "draft" || statusRaw === "issued" || statusRaw === "revised"
      ? statusRaw
      : "issued";
  const docNum = row.document_number;
  return {
    id: String(row.id),
    documentNumber:
      docNum !== undefined && docNum !== null ? String(docNum) : undefined,
    vehicleId: String(row.vehicle_id ?? ""),
    customerId: String(row.customer_id ?? ""),
    type: payment,
    total: num(row.total),
    discount: num(row.discount),
    tax: num(row.tax),
    status,
    createdAt: String(row.created_at ?? new Date().toISOString())
  };
}

export function invoiceToApi(
  input: {
    vehicleId: string;
    customerId: string;
    type: Invoice["type"];
    total: number;
    discount: number;
    tax: number;
  },
  options?: { forceReservedSale?: boolean; forceDiscount?: boolean }
) {
  return {
    vehicle_id: input.vehicleId,
    customer_id: input.customerId,
    payment_type: input.type,
    total: input.total,
    discount: input.discount,
    tax: input.tax,
    force_reserved_sale: options?.forceReservedSale ?? false,
    force_discount: options?.forceDiscount ?? false
  };
}
