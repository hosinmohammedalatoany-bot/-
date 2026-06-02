import { z } from "zod";

export const vehicleSchema = z.object({
  internalNumber: z.string().min(3, "Internal number is required"),
  vin: z.string().min(11, "VIN must be at least 11 characters").max(17),
  plateNumber: z.string().min(2),
  manufacturer: z.string().min(2),
  model: z.string().min(1),
  trim: z.string().min(1),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  exteriorColor: z.string().min(2),
  interiorColor: z.string().min(2),
  fuelType: z.string().min(2),
  transmission: z.string().min(2),
  mileage: z.coerce.number().int().min(0),
  purchasePrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  minimumSalePrice: z.coerce.number().min(0),
  maintenanceCost: z.coerce.number().min(0),
  transportationCost: z.coerce.number().min(0),
  branch: z.string().min(1),
  supplier: z.string().min(1)
});

export const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email(),
  address: z.string().min(2),
  idNumber: z.string().min(2),
  notes: z.string().optional()
});

export const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  source: z.enum(["WhatsApp", "Facebook", "Instagram", "Walk-In", "Phone Call"]),
  assignedTo: z.string().min(2),
  vehicleId: z.string().optional(),
  note: z.string().optional()
});

export const reservationSchema = z.object({
  vehicleId: z.string().min(1),
  customerId: z.string().min(1),
  employee: z.string().min(2),
  deposit: z.coerce.number().min(0),
  expiresAt: z.string().min(1)
});

export const invoiceSchema = z.object({
  vehicleId: z.string().min(1),
  customerId: z.string().min(1),
  type: z.enum(["cash", "bank-transfer", "installment", "mixed"]),
  total: z.coerce.number().min(1),
  discount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0)
});

export const expenseSchema = z.object({
  category: z.string().min(2),
  amount: z.coerce.number().min(0.01),
  branch: z.string().min(1),
  description: z.string().min(2)
});

export const installmentPaymentSchema = z.object({
  installmentId: z.string().min(1),
  amount: z.coerce.number().min(0.01)
});

export const installmentContractSchema = z.object({
  customerId: z.string().min(1),
  vehicleId: z.string().min(1),
  saleInvoiceId: z.string().optional(),
  totalAmount: z.coerce.number().min(1),
  downPayment: z.coerce.number().min(0),
  installmentCount: z.coerce.number().int().min(1).max(120),
  startDate: z.string().min(1),
  intervalDays: z.coerce.number().int().min(7).max(365).optional()
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type InstallmentPaymentInput = z.infer<typeof installmentPaymentSchema>;
export type InstallmentContractInput = z.infer<typeof installmentContractSchema>;
