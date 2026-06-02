import type { Installment } from "@/lib/domain";

export type ScheduleEntryApi = Record<string, unknown>;

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export function installmentFromScheduleApi(row: ScheduleEntryApi): Installment {
  const due = String(row.due_date ?? "");
  return {
    id: String(row.id),
    customerId: String(row.customer_id ?? ""),
    vehicleId: String(row.vehicle_id ?? ""),
    dueDate: due.includes("T") ? due : `${due}T12:00:00.000Z`,
    amount: num(row.amount),
    paidAmount: num(row.paid_amount),
    status: (row.status as Installment["status"]) ?? "pending"
  };
}

export type InstallmentContractApi = {
  id: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehicleLabel: string;
  saleInvoiceId?: string;
  saleInvoiceNumber?: string;
  totalAmount: number;
  downPayment: number;
  installmentCount: number;
  branchName: string;
  startDate: string;
  status: string;
  createdAt: string;
};

export function contractFromApi(row: Record<string, unknown>): InstallmentContractApi {
  return {
    id: String(row.id),
    contractNumber: String(row.contract_number ?? ""),
    customerId: String(row.customer_id ?? ""),
    customerName: String(row.customer_name ?? ""),
    vehicleId: String(row.vehicle_id ?? ""),
    vehicleLabel: String(row.vehicle_label ?? ""),
    saleInvoiceId: row.sale_invoice_id ? String(row.sale_invoice_id) : undefined,
    saleInvoiceNumber: row.sale_invoice_number
      ? String(row.sale_invoice_number)
      : undefined,
    totalAmount: num(row.total_amount),
    downPayment: num(row.down_payment),
    installmentCount: num(row.installment_count),
    branchName: String(row.branch_name ?? ""),
    startDate: String(row.start_date ?? ""),
    status: String(row.status ?? "active"),
    createdAt: String(row.created_at ?? new Date().toISOString())
  };
}

export function contractCreateToApi(input: {
  customerId: string;
  vehicleId: string;
  saleInvoiceId?: string;
  totalAmount: number;
  downPayment: number;
  installmentCount: number;
  startDate: string;
  intervalDays?: number;
  branchName?: string;
  notes?: string;
}) {
  const body: Record<string, unknown> = {
    customer_id: input.customerId,
    vehicle_id: input.vehicleId,
    total_amount: input.totalAmount,
    down_payment: input.downPayment,
    installment_count: input.installmentCount,
    start_date: input.startDate.slice(0, 10),
    interval_days: input.intervalDays ?? 30,
    branch_name: input.branchName ?? "",
    notes: input.notes ?? ""
  };
  if (input.saleInvoiceId) body.sale_invoice_id = input.saleInvoiceId;
  return body;
}

export function paymentCreateToApi(input: {
  scheduleEntryId: string;
  amount: number;
  paymentDate?: string;
  receiptReference?: string;
  saleInvoiceId?: string;
  notes?: string;
}) {
  const body: Record<string, unknown> = {
    schedule_entry_id: input.scheduleEntryId,
    amount: input.amount
  };
  if (input.paymentDate) body.payment_date = input.paymentDate.slice(0, 10);
  if (input.receiptReference) body.receipt_reference = input.receiptReference;
  if (input.saleInvoiceId) body.sale_invoice_id = input.saleInvoiceId;
  if (input.notes) body.notes = input.notes;
  return body;
}
