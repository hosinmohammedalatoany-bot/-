import { z } from "zod";

export const vehicleSchema = z.object({
  internalNumber: z.string().min(3, "الرقم الداخلي مطلوب"),
  vin: z.string().min(11, "رقم VIN يجب أن يكون 11 حرفاً على الأقل").max(17, "رقم VIN يجب ألا يتجاوز 17 حرفاً"),
  plateNumber: z.string().min(2, "رقم اللوحة مطلوب"),
  manufacturer: z.string().min(2, "الشركة المصنعة مطلوبة"),
  model: z.string().min(1, "الموديل مطلوب"),
  trim: z.string().min(1, "الفئة مطلوبة"),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  exteriorColor: z.string().min(2, "اللون الخارجي مطلوب"),
  interiorColor: z.string().min(2, "اللون الداخلي مطلوب"),
  fuelType: z.string().min(2, "نوع الوقود مطلوب"),
  transmission: z.string().min(2, "ناقل الحركة مطلوب"),
  mileage: z.coerce.number().int().min(0),
  purchasePrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  minimumSalePrice: z.coerce.number().min(0),
  maintenanceCost: z.coerce.number().min(0),
  transportationCost: z.coerce.number().min(0),
  branch: z.string().min(1, "الفرع مطلوب"),
  supplier: z.string().min(1, "المورد مطلوب")
});

export const customerSchema = z.object({
  name: z.string().min(2, "اسم العميل مطلوب"),
  phone: z.string().min(7, "رقم الهاتف غير صحيح"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  address: z.string().min(2, "العنوان مطلوب"),
  idNumber: z.string().min(2, "رقم الهوية مطلوب"),
  notes: z.string().optional()
});

export const leadSchema = z.object({
  name: z.string().min(2, "اسم العميل المحتمل مطلوب"),
  phone: z.string().min(7, "رقم الهاتف غير صحيح"),
  source: z.enum(["WhatsApp", "Facebook", "Instagram", "Walk-In", "Phone Call"]),
  assignedTo: z.string().min(2, "اسم الموظف المسؤول مطلوب"),
  vehicleId: z.string().optional(),
  note: z.string().optional()
});

export const reservationSchema = z.object({
  vehicleId: z.string().min(1, "السيارة مطلوبة"),
  customerId: z.string().min(1, "العميل مطلوب"),
  employee: z.string().min(2, "الموظف مطلوب"),
  deposit: z.coerce.number().min(0),
  expiresAt: z.string().min(1, "تاريخ انتهاء الحجز مطلوب")
});

export const invoiceSchema = z.object({
  vehicleId: z.string().min(1, "السيارة مطلوبة"),
  customerId: z.string().min(1, "العميل مطلوب"),
  type: z.enum(["cash", "bank-transfer", "installment", "mixed"]),
  total: z.coerce.number().min(1),
  discount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0)
});

export const expenseSchema = z.object({
  category: z.string().min(2, "فئة المصروف مطلوبة"),
  amount: z.coerce.number().min(0.01),
  branch: z.string().min(1, "الفرع مطلوب"),
  description: z.string().min(2, "الوصف مطلوب")
});

export const installmentPaymentSchema = z.object({
  installmentId: z.string().min(1, "القسط مطلوب"),
  amount: z.coerce.number().min(0.01)
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type InstallmentPaymentInput = z.infer<typeof installmentPaymentSchema>;
