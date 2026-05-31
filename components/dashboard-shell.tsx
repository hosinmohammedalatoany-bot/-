"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type DefaultValues, type UseFormRegisterReturn } from "react-hook-form";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  Building2,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  CloudOff,
  DatabaseBackup,
  FileDown,
  FileText,
  Gauge,
  KeyRound,
  MessageCircle,
  PackageCheck,
  Printer,
  QrCode,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRoundPlus,
  Users,
  Wrench
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import {
  modules,
  permissionGroups,
  requiredDatabaseTables,
  type ModuleKey,
  type Vehicle
} from "@/lib/domain";
import { useShowroomStore } from "@/lib/offline-store";
import {
  type CustomerInput,
  type ExpenseInput,
  type InstallmentPaymentInput,
  type InvoiceInput,
  type LeadInput,
  type ReservationInput,
  type VehicleInput,
  customerSchema,
  expenseSchema,
  installmentPaymentSchema,
  invoiceSchema,
  leadSchema,
  reservationSchema,
  vehicleSchema
} from "@/lib/validation";
import { cn, formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";

const moduleIcons: Record<ModuleKey, React.ReactNode> = {
  dashboard: <Gauge className="h-4 w-4" />,
  cars: <Car className="h-4 w-4" />,
  customers: <Users className="h-4 w-4" />,
  leads: <UserRoundPlus className="h-4 w-4" />,
  sales: <Receipt className="h-4 w-4" />,
  installments: <BadgeDollarSign className="h-4 w-4" />,
  purchases: <PackageCheck className="h-4 w-4" />,
  inventory: <ClipboardCheck className="h-4 w-4" />,
  accounting: <FileText className="h-4 w-4" />,
  employees: <Users className="h-4 w-4" />,
  branches: <Building2 className="h-4 w-4" />,
  reservations: <CheckCircle2 className="h-4 w-4" />,
  "test-drives": <Gauge className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
  insurance: <ShieldCheck className="h-4 w-4" />,
  offers: <Sparkles className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  reports: <FileDown className="h-4 w-4" />,
  notifications: <Bell className="h-4 w-4" />,
  permissions: <KeyRound className="h-4 w-4" />,
  printing: <Printer className="h-4 w-4" />,
  "backup-sync": <DatabaseBackup className="h-4 w-4" />,
  "system-health": <Activity className="h-4 w-4" />,
  settings: <ShieldCheck className="h-4 w-4" />
};

const mainMenuKeys: ModuleKey[] = [
  "dashboard",
  "cars",
  "customers",
  "sales",
  "installments",
  "purchases",
  "inventory",
  "accounting",
  "employees",
  "branches",
  "reports",
  "settings"
];

const arabicModuleCopy: Record<ModuleKey, { title: string; description: string; capabilities: string[] }> = {
  dashboard: {
    title: "لوحة التحكم",
    description: "مؤشرات الأداء والتنبيهات والمخططات وحالة المزامنة.",
    capabilities: ["بطاقات المؤشرات", "المخططات", "التنبيهات", "أفضل الموظفين", "حالة المزامنة"]
  },
  cars: {
    title: "إدارة السيارات",
    description: "إدارة دورة حياة السيارة والرقم الداخلي و VIN والملفات وتحليل الربح.",
    capabilities: ["إضافة وتعديل", "منع تكرار VIN", "QR وباركود", "صور وملفات", "سجل السيارة"]
  },
  customers: {
    title: "العملاء",
    description: "ملفات العملاء وسجل الشراء وكشوف الحساب والملاحظات والاتصالات.",
    capabilities: ["ملف العميل", "وثائق الهوية", "كشف حساب", "المدفوعات", "سجل التواصل"]
  },
  leads: {
    title: "العملاء المحتملون",
    description: "مصادر العملاء المحتملين والمتابعات والتذكيرات والتحويل إلى عميل.",
    capabilities: ["عملاء واتساب", "متابعات", "تعيين موظف", "تحويل لعميل", "تذكيرات"]
  },
  sales: {
    title: "المبيعات",
    description: "فواتير البيع والعقود والدفع المختلط والعمولات والقيود المحاسبية.",
    capabilities: ["بيع نقدي", "بيع بالأقساط", "فاتورة PDF", "عقود", "عمولات"]
  },
  installments: {
    title: "الأقساط",
    description: "عقود الأقساط والجداول والإيصالات والتنبيهات والتذكير عبر واتساب.",
    capabilities: ["جدول الدفعات", "إيصالات", "تنبيهات التأخير", "الفائدة", "رسائل تذكير"]
  },
  purchases: {
    title: "المشتريات",
    description: "شراء السيارات والموردون وحساب التكلفة وربط المخزون والمحاسبة.",
    capabilities: ["سجل المورد", "وثائق الشراء", "حساب التكلفة", "إدخال للمخزون", "ربط محاسبي"]
  },
  inventory: {
    title: "المخزون",
    description: "مخزون الفروع وحالة الجاهزية والتحويلات وتقارير المخزون.",
    capabilities: ["مخزون الفروع", "تحويل سيارة", "حالة الجاهزية", "تقارير المخزون", "الجرد"]
  },
  accounting: {
    title: "المحاسبة",
    description: "الإيرادات والمصروفات والصندوق والبنوك والرواتب والأرباح والخسائر.",
    capabilities: ["الصندوق", "الحسابات البنكية", "الأرباح والخسائر", "الرواتب", "الأرصدة"]
  },
  employees: {
    title: "الموظفون",
    description: "إدارة الموظفين والرواتب والعمولات والفروع وسجل النشاط.",
    capabilities: ["الأدوار", "العمولات", "الأداء", "الراتب", "سجل النشاط"]
  },
  branches: {
    title: "الفروع",
    description: "دعم تعدد الفروع والمبيعات والمخزون والموظفين والتحويلات.",
    capabilities: ["المخزون", "المبيعات", "الموظفون", "التحويلات", "أداء الفرع"]
  },
  reservations: {
    title: "الحجوزات",
    description: "إيصالات الحجز والعربون وانتهاء الحجز والتذكير والموافقات.",
    capabilities: ["العربون", "إيصال حجز", "انتهاء الحجز", "الموافقات", "الإشعارات"]
  },
  "test-drives": {
    title: "تجربة القيادة",
    description: "جدولة تجربة القيادة وربط العميل والسيارة والموظف والملاحظات.",
    capabilities: ["الجدولة", "نموذج العميل", "تعيين موظف", "استلام السيارة", "ملاحظات"]
  },
  maintenance: {
    title: "الصيانة",
    description: "سجل التصليحات والتكاليف والجاهزية والموردين ووثائق الصيانة.",
    capabilities: ["سجل الإصلاح", "التكاليف", "الموردون", "الجاهزية", "التاريخ"]
  },
  insurance: {
    title: "التأمين",
    description: "وثائق التأمين والتنبيهات والتجديد والملفات وشركات التأمين.",
    capabilities: ["الوثائق", "تنبيهات الانتهاء", "الملفات", "الشركات", "التجديد"]
  },
  offers: {
    title: "العروض",
    description: "العروض والخصومات والموافقات والحملات وربط العملاء المحتملين.",
    capabilities: ["خصومات", "موافقات", "حملات", "تسجيل اهتمام", "تحليلات"]
  },
  whatsapp: {
    title: "واتساب",
    description: "مشاركة السيارات والفواتير والعقود وتذكير الأقساط والحجوزات.",
    capabilities: ["مشاركة سيارة", "إرسال PDF", "قوالب رسائل", "تذكيرات", "سجل الرسائل"]
  },
  reports: {
    title: "التقارير",
    description: "تقارير المبيعات والأرباح والمصروفات والمخزون والعملاء والموظفين.",
    capabilities: ["PDF", "Excel", "يومي", "شهري", "سنوي"]
  },
  notifications: {
    title: "الإشعارات",
    description: "إشعارات البيع والحجز والأقساط والتأمين والوثائق وفشل المزامنة.",
    capabilities: ["تنبيهات الاستحقاق", "تنبيهات المزامنة", "طلبات الموافقة", "تنبيهات الانتهاء", "تحديد كمقروء"]
  },
  permissions: {
    title: "المستخدمون والصلاحيات",
    description: "الأدوار والصلاحيات التفصيلية والموافقات وسجل التدقيق.",
    capabilities: ["صلاحيات", "موافقات", "سجل التدقيق", "صلاحيات الفروع", "مصفوفة الصلاحيات"]
  },
  printing: {
    title: "مركز الطباعة",
    description: "طباعة A4 وحرارية و PDF و Excel ومعاينة وقوالب تدعم العربية.",
    capabilities: ["A4", "طباعة حرارية", "PDF", "Excel", "قوالب عربية"]
  },
  "backup-sync": {
    title: "النسخ الاحتياطي والمزامنة",
    description: "طابور أوفلاين وسجل التعارضات ورفع الملفات والنسخ الاحتياطي.",
    capabilities: ["طابور أوفلاين", "سجل التعارضات", "نسخ احتياطي", "مزامنة الملفات", "مطابقة البيانات"]
  },
  "system-health": {
    title: "مراقبة النظام",
    description: "جلسات الأجهزة وتثبيت PWA وصحة التخزين والأخطاء والمزامنة.",
    capabilities: ["جلسات الأجهزة", "تثبيت PWA", "سجل الأخطاء", "صحة API", "صحة التخزين"]
  },
  settings: {
    title: "الإعدادات",
    description: "هوية الشركة والشعار والختم والتوقيع والضرائب وقوالب الطباعة.",
    capabilities: ["بيانات الشركة", "رفع الشعار", "الختم", "التوقيع", "القوالب"]
  }
};

const statusCopy: Record<string, string> = {
  available: "متاحة",
  reserved: "محجوزة",
  sold: "مباعة",
  maintenance: "صيانة",
  "not-ready": "غير جاهزة",
  paid: "مدفوع",
  pending: "قيد الانتظار",
  overdue: "متأخر",
  online: "متصل",
  offline: "غير متصل",
  syncing: "جاري المزامنة"
};

const leadSourceCopy: Record<string, string> = {
  WhatsApp: "واتساب",
  Facebook: "فيسبوك",
  Instagram: "إنستغرام",
  "Walk-In": "زيارة مباشرة",
  "Phone Call": "مكالمة هاتفية"
};

const operationCopy: Record<string, string> = {
  "vehicle.create": "إضافة سيارة",
  "vehicle.update": "تعديل سيارة",
  "customer.create": "إضافة عميل",
  "lead.create": "إضافة عميل محتمل",
  "reservation.create": "إنشاء حجز",
  "invoice.create": "إصدار فاتورة",
  "expense.create": "تسجيل مصروف",
  "installment.payment": "دفعة قسط",
  "file.attach": "إرفاق ملف"
};

const auditActionCopy: Record<string, string> = {
  "Vehicle reserved": "تم حجز سيارة",
  "Expense recorded": "تم تسجيل مصروف",
  "Vehicle created": "تمت إضافة سيارة",
  "Customer created": "تمت إضافة عميل",
  "Lead created": "تمت إضافة عميل محتمل",
  "Reservation created": "تم إنشاء حجز",
  "Invoice issued": "تم إصدار فاتورة",
  "Installment payment recorded": "تم تسجيل دفعة قسط",
  "Offline queue synchronized": "تمت مزامنة الطابور",
  "Local file queued": "تمت إضافة ملف للطابور",
  "Vehicle status updated": "تم تحديث حالة السيارة"
};

type ReportKey =
  | "invoice"
  | "sale-contract"
  | "installment-contract"
  | "payment-receipt"
  | "reservation-receipt"
  | "customer-statement"
  | "supplier-statement"
  | "sales"
  | "profit-loss"
  | "expenses"
  | "available-cars"
  | "sold-cars"
  | "reserved-cars"
  | "inventory"
  | "installments"
  | "paid-installments"
  | "overdue-installments"
  | "customers"
  | "employees"
  | "branches"
  | "maintenance"
  | "insurance"
  | "cars-table"
  | "customers-table"
  | "sales-table"
  | "installments-table"
  | "expenses-table"
  | "employees-table"
  | "branches-table";

interface PrintableReport {
  title: string;
  subtitle: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  summary: Array<{ label: string; value: string | number }>;
}

const reportTabs: Array<{ key: ReportKey; title: string }> = [
  { key: "invoice", title: "فاتورة بيع" },
  { key: "sale-contract", title: "عقد بيع" },
  { key: "installment-contract", title: "عقد تقسيط" },
  { key: "payment-receipt", title: "إيصال دفع" },
  { key: "reservation-receipt", title: "إيصال حجز" },
  { key: "customer-statement", title: "كشف حساب عميل" },
  { key: "supplier-statement", title: "كشف حساب مورد" },
  { key: "sales", title: "تقرير المبيعات" },
  { key: "profit-loss", title: "تقرير الأرباح والخسائر" },
  { key: "expenses", title: "تقرير المصروفات" },
  { key: "available-cars", title: "السيارات المتوفرة" },
  { key: "sold-cars", title: "السيارات المباعة" },
  { key: "reserved-cars", title: "السيارات المحجوزة" },
  { key: "inventory", title: "تقرير المخزون" },
  { key: "paid-installments", title: "الأقساط المدفوعة" },
  { key: "overdue-installments", title: "الأقساط المتأخرة" },
  { key: "installments", title: "تقرير الأقساط" },
  { key: "customers", title: "تقرير العملاء" },
  { key: "employees", title: "تقرير الموظفين" },
  { key: "branches", title: "تقرير الفروع" },
  { key: "maintenance", title: "تقرير الصيانة" },
  { key: "insurance", title: "تقرير التأمين والمستندات" },
  { key: "cars-table", title: "جدول السيارات" },
  { key: "customers-table", title: "جدول العملاء" },
  { key: "sales-table", title: "جدول المبيعات" },
  { key: "installments-table", title: "جدول الأقساط" },
  { key: "expenses-table", title: "جدول المصروفات" },
  { key: "employees-table", title: "جدول الموظفين" },
  { key: "branches-table", title: "جدول الفروع" }
];

const roleCopy: Record<string, { role: string; permissions: string[] }> = {
  "Super Admin": {
    role: "مدير النظام",
    permissions: ["كل الموديولات", "اعتماد المبيعات الكبيرة", "حذف السيارات", "تصدير كل التقارير", "إدارة النسخ الاحتياطي"]
  },
  "Branch Manager": {
    role: "مدير الفرع",
    permissions: ["لوحة الفرع", "اعتماد الخصومات", "تحويل السيارات", "إدارة الموظفين", "طباعة التقارير"]
  },
  "Sales Employee": {
    role: "موظف مبيعات",
    permissions: ["إنشاء العملاء المحتملين", "إنشاء الحجوزات", "إنشاء المبيعات", "مشاركة واتساب", "عرض عملائه فقط"]
  },
  Accountant: {
    role: "محاسب",
    permissions: ["المحاسبة", "المصروفات", "دفعات الأقساط", "التقارير المالية", "كشوف العملاء"]
  },
  "Inventory Employee": {
    role: "موظف مخزون",
    permissions: ["إضافة السيارات", "رفع الوثائق", "تقارير الحالة", "حالة الصيانة", "تقارير المخزون"]
  },
  "Read Only": {
    role: "قراءة فقط",
    permissions: ["عرض اللوحات", "عرض السيارات", "عرض التقارير", "بدون تصدير", "بدون تعديل الأسعار"]
  }
};

const defaultVehicle: VehicleInput = {
  internalNumber: "BR-2026-004",
  vin: "SALWR2SU1NA123456",
  plateNumber: "BAG-404",
  manufacturer: "Range Rover",
  model: "Sport",
  trim: "HSE",
  year: 2024,
  exteriorColor: "Dark Blue",
  interiorColor: "Ivory",
  fuelType: "Petrol",
  transmission: "Automatic",
  mileage: 5200,
  purchasePrice: 79500,
  salePrice: 88400,
  minimumSalePrice: 85000,
  maintenanceCost: 450,
  transportationCost: 700,
  branch: "Main Showroom",
  supplier: "Gulf Luxury Motors"
};

const defaultCustomer: CustomerInput = {
  name: "Ahmed Raheem",
  phone: "+964 770 000 3300",
  email: "ahmed@example.com",
  address: "Baghdad, Jadriya",
  idNumber: "ID-303030",
  notes: "Needs bank transfer invoice."
};

const defaultLead: LeadInput = {
  name: "Huda Kareem",
  phone: "+964 751 123 9088",
  source: "WhatsApp",
  assignedTo: "Sara N.",
  vehicleId: "veh-001",
  note: "Asked for finance details."
};

function statusLabel(status: Vehicle["status"]) {
  return statusCopy[status] ?? status;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "available" || status === "paid"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
      : status === "reserved" || status === "pending"
        ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
        : status === "sold"
          ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
          : "border-red-400/40 bg-red-400/10 text-red-200";

  return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", color)}>{statusCopy[status] ?? status}</span>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm text-white/70">
      <span>{label}</span>
      {children}
      {error && <span className="text-xs text-red-300">{error}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-[#d6a84f]/70";

function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled = false
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-gradient-to-r from-[#f3c96b] to-[#a77b34] px-4 py-2 text-sm font-bold text-black shadow-lg shadow-[#d6a84f]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#d6a84f]/60 hover:bg-[#d6a84f]/10"
    >
      {children}
    </button>
  );
}

function useValidatedForm<T extends Record<string, unknown>>(defaults: T) {
  return useForm<T>({ defaultValues: defaults as DefaultValues<T> });
}

export function DashboardShell() {
  const store = useShowroomStore();
  const hydrateStore = useShowroomStore((state) => state.hydrate);
  const setNetworkStatus = useShowroomStore((state) => state.setNetworkStatus);
  const [actionLog, setActionLog] = useState<string[]>(["النظام جاهز. طابور العمل بدون إنترنت مفعل."]);
  const [rtl, setRtl] = useState(true);
  const [activeReportKey, setActiveReportKey] = useState<ReportKey>("inventory");
  const [printTimestamp, setPrintTimestamp] = useState(() => new Date().toISOString());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<"all" | Vehicle["status"]>("all");
  const [vehiclePage, setVehiclePage] = useState(1);
  const vehicleForm = useValidatedForm<VehicleInput>(defaultVehicle);
  const customerForm = useValidatedForm<CustomerInput>(defaultCustomer);
  const leadForm = useValidatedForm<LeadInput>(defaultLead);
  const reservationForm = useValidatedForm<ReservationInput>({
    vehicleId: "veh-001",
    customerId: "cus-001",
    employee: "Sara N.",
    deposit: 1000,
    expiresAt: "2026-06-02T10:00"
  });
  const invoiceForm = useValidatedForm<InvoiceInput>({
    vehicleId: "veh-001",
    customerId: "cus-001",
    type: "mixed",
    total: 48900,
    discount: 500,
    tax: 0
  });
  const expenseForm = useValidatedForm<ExpenseInput>({
    category: "تسويق",
    amount: 250,
    branch: "Main Showroom",
    description: "حملة سيارة على إنستغرام"
  });
  const paymentForm = useValidatedForm<InstallmentPaymentInput>({ installmentId: "ins-001", amount: 950 });

  useEffect(() => {
    void hydrateStore();
  }, [hydrateStore]);

  useEffect(() => {
    const updateNetwork = () => setNetworkStatus(navigator.onLine);
    updateNetwork();
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    return () => {
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, [setNetworkStatus]);

  const metrics = useMemo(() => {
    const available = store.vehicles.filter((vehicle) => vehicle.status === "available").length;
    const sold = store.vehicles.filter((vehicle) => vehicle.status === "sold").length;
    const reserved = store.vehicles.filter((vehicle) => vehicle.status === "reserved").length;
    const totalSales = store.invoices.reduce((sum, invoice) => sum + invoice.total - invoice.discount + invoice.tax, 0);
    const expenses = store.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const inventoryValue = store.vehicles.reduce((sum, vehicle) => sum + vehicle.purchasePrice, 0);
    const expectedProfit = store.vehicles.reduce(
      (sum, vehicle) => sum + vehicle.salePrice - vehicle.purchasePrice - vehicle.maintenanceCost - vehicle.transportationCost,
      0
    );
    const todaysInstallments = store.installments.filter((installment) => {
      const dueDate = new Date(installment.dueDate);
      return dueDate.toDateString() === new Date().toDateString();
    });
    return {
      available,
      sold,
      reserved,
      totalSales,
      expenses,
      inventoryValue,
      expectedProfit,
      todaysInstallments: todaysInstallments.length,
      overdueInstallments: store.installments.filter((installment) => installment.status === "overdue").length
    };
  }, [store.vehicles, store.invoices, store.expenses, store.installments]);

  const primaryInvoice = store.invoices[0];
  const primaryVehicle = store.vehicles.find((vehicle) => vehicle.id === primaryInvoice?.vehicleId) ?? store.vehicles[0];
  const primaryCustomer = store.customers.find((customer) => customer.id === primaryInvoice?.customerId) ?? store.customers[0];
  const primaryReservation = store.reservations[0];
  const primaryInstallment = store.installments[0];
  const soldVehicles = store.vehicles.filter((vehicle) => vehicle.status === "sold");
  const reservedVehicles = store.vehicles.filter((vehicle) => vehicle.status === "reserved");
  const availableVehicles = store.vehicles.filter((vehicle) => vehicle.status === "available");
  const paidInstallments = store.installments.filter((installment) => installment.status === "paid");
  const overdueInstallments = store.installments.filter((installment) => installment.status === "overdue");

  const printableReports = useMemo<Record<ReportKey, PrintableReport>>(
    () => ({
      invoice: {
        title: "فاتورة بيع سيارة",
        subtitle: "فاتورة رسمية تتضمن بيانات الشركة والعميل والسيارة والدفع.",
        headers: ["البند", "القيمة"],
        rows: [
          ["رقم الفاتورة", primaryInvoice?.id ?? "INV-DRAFT-001"],
          ["تاريخ الفاتورة", primaryInvoice ? formatDateTime(primaryInvoice.createdAt) : formatDateTime(new Date())],
          ["اسم العميل", primaryCustomer?.name ?? "غير محدد"],
          ["هاتف العميل", primaryCustomer?.phone ?? "غير محدد"],
          ["السيارة", primaryVehicle ? `${primaryVehicle.manufacturer} ${primaryVehicle.model} ${primaryVehicle.year}` : "غير محدد"],
          ["VIN", primaryVehicle?.vin ?? "غير محدد"],
          ["رقم اللوحة", primaryVehicle?.plateNumber ?? "غير محدد"],
          ["سعر السيارة", primaryInvoice ? formatCurrency(primaryInvoice.total) : formatCurrency(primaryVehicle?.salePrice ?? 0)],
          ["الخصم", formatCurrency(primaryInvoice?.discount ?? 0)],
          ["الضريبة", formatCurrency(primaryInvoice?.tax ?? 0)],
          ["الإجمالي النهائي", primaryInvoice ? formatCurrency(primaryInvoice.total - primaryInvoice.discount + primaryInvoice.tax) : formatCurrency(primaryVehicle?.salePrice ?? 0)],
          ["طريقة الدفع", primaryInvoice?.type ?? "مختلط"],
          ["الموظف", "المدير العام"]
        ],
        summary: [
          { label: "رقم الفاتورة", value: primaryInvoice?.id ?? "INV-DRAFT-001" },
          { label: "الإجمالي", value: primaryInvoice ? formatCurrency(primaryInvoice.total) : formatCurrency(primaryVehicle?.salePrice ?? 0) },
          { label: "الحالة", value: "جاهزة للطباعة" }
        ]
      },
      "sale-contract": {
        title: "عقد بيع سيارة",
        subtitle: "عقد بيع رسمي بين المعرض والعميل مع بيانات السيارة والشروط.",
        headers: ["الفقرة", "التفاصيل"],
        rows: [
          ["رقم العقد", `SC-${primaryInvoice?.id ?? "001"}`],
          ["الطرف الأول", "Baraa Raed لإدارة معارض السيارات"],
          ["الطرف الثاني", primaryCustomer?.name ?? "غير محدد"],
          ["بيانات السيارة", primaryVehicle ? `${primaryVehicle.manufacturer} ${primaryVehicle.model} ${primaryVehicle.trim} ${primaryVehicle.year}` : "غير محدد"],
          ["رقم الهيكل", primaryVehicle?.vin ?? "غير محدد"],
          ["سعر البيع", primaryInvoice ? formatCurrency(primaryInvoice.total) : formatCurrency(primaryVehicle?.salePrice ?? 0)],
          ["طريقة الدفع", primaryInvoice?.type ?? "مختلط"],
          ["إقرار الاستلام", "يقر الطرف الثاني باستلام السيارة بالحالة الموضحة في النظام."],
          ["الشروط", "لا يتم تعديل العقد المعتمد إلا بإصدار نسخة قانونية جديدة مع سبب التعديل."]
        ],
        summary: [
          { label: "نوع المستند", value: "عقد بيع" },
          { label: "العميل", value: primaryCustomer?.name ?? "غير محدد" },
          { label: "السيارة", value: primaryVehicle?.internalNumber ?? "غير محدد" }
        ]
      },
      "installment-contract": {
        title: "عقد تقسيط",
        subtitle: "عقد تقسيط رسمي يتضمن الدفعة المقدمة وجدول الأقساط.",
        headers: ["البند", "القيمة"],
        rows: [
          ["رقم العقد", "IC-001"],
          ["العميل", primaryCustomer?.name ?? "غير محدد"],
          ["السيارة", primaryVehicle ? `${primaryVehicle.manufacturer} ${primaryVehicle.model}` : "غير محدد"],
          ["السعر الإجمالي", formatCurrency(primaryVehicle?.salePrice ?? 0)],
          ["الدفعة المقدمة", formatCurrency(5000)],
          ["المبلغ المتبقي", formatCurrency(Math.max((primaryVehicle?.salePrice ?? 0) - 5000, 0))],
          ["عدد الأقساط", "24"],
          ["قيمة القسط", formatCurrency(primaryInstallment?.amount ?? 0)],
          ["تاريخ بداية الأقساط", primaryInstallment ? formatDateTime(primaryInstallment.dueDate) : formatDateTime(new Date())],
          ["الشروط", "يلتزم العميل بالسداد في تاريخ الاستحقاق وتطبق تنبيهات التأخير حسب سياسة المعرض."]
        ],
        summary: [
          { label: "عدد الأقساط", value: "24" },
          { label: "القسط الحالي", value: formatCurrency(primaryInstallment?.amount ?? 0) },
          { label: "الحالة", value: "جاهز للطباعة" }
        ]
      },
      "payment-receipt": {
        title: "إيصال دفع قسط",
        subtitle: "إيصال رسمي لاستلام دفعة قسط من العميل.",
        headers: ["البند", "القيمة"],
        rows: [
          ["رقم الإيصال", "REC-001"],
          ["تاريخ الدفع", formatDateTime(new Date())],
          ["اسم العميل", primaryCustomer?.name ?? "غير محدد"],
          ["رقم الهاتف", primaryCustomer?.phone ?? "غير محدد"],
          ["رقم القسط", primaryInstallment?.id ?? "غير محدد"],
          ["قيمة القسط", formatCurrency(primaryInstallment?.amount ?? 0)],
          ["المبلغ المدفوع", formatCurrency(primaryInstallment?.paidAmount ?? 0)],
          ["المتبقي", formatCurrency(Math.max((primaryInstallment?.amount ?? 0) - (primaryInstallment?.paidAmount ?? 0), 0))],
          ["طريقة الدفع", "نقدي"],
          ["الموظف المستلم", "المدير العام"]
        ],
        summary: [
          { label: "المبلغ", value: formatCurrency(primaryInstallment?.paidAmount ?? 0) },
          { label: "القسط", value: primaryInstallment?.id ?? "غير محدد" },
          { label: "العميل", value: primaryCustomer?.name ?? "غير محدد" }
        ]
      },
      "reservation-receipt": {
        title: "إيصال حجز سيارة",
        subtitle: "إيصال حجز رسمي يتضمن بيانات العميل والسيارة والعربون.",
        headers: ["البند", "القيمة"],
        rows: [
          ["رقم الحجز", primaryReservation?.id ?? "RES-DRAFT-001"],
          ["تاريخ الحجز", formatDateTime(new Date())],
          ["اسم العميل", primaryCustomer?.name ?? "غير محدد"],
          ["رقم الهاتف", primaryCustomer?.phone ?? "غير محدد"],
          ["السيارة", primaryVehicle ? `${primaryVehicle.manufacturer} ${primaryVehicle.model}` : "غير محدد"],
          ["مبلغ العربون", formatCurrency(primaryReservation?.deposit ?? 0)],
          ["تاريخ انتهاء الحجز", primaryReservation ? formatDateTime(primaryReservation.expiresAt) : formatDateTime(new Date())],
          ["شروط الحجز", "الحجز قابل للتحويل إلى بيع قبل تاريخ الانتهاء حسب موافقة الإدارة."]
        ],
        summary: [
          { label: "رقم الحجز", value: primaryReservation?.id ?? "RES-DRAFT-001" },
          { label: "العربون", value: formatCurrency(primaryReservation?.deposit ?? 0) },
          { label: "الحالة", value: "نشط" }
        ]
      },
      "customer-statement": {
        title: "كشف حساب العميل",
        subtitle: "ملخص أرصدة العميل ومشترياته وأقساطه.",
        headers: ["البند", "القيمة"],
        rows: [
          ["اسم العميل", primaryCustomer?.name ?? "غير محدد"],
          ["الهاتف", primaryCustomer?.phone ?? "غير محدد"],
          ["العنوان", primaryCustomer?.address ?? "غير محدد"],
          ["الرصيد", formatCurrency(primaryCustomer?.balance ?? 0)],
          ["عدد المشتريات", primaryCustomer?.purchases ?? 0],
          ["عدد الأقساط", store.installments.filter((item) => item.customerId === primaryCustomer?.id).length],
          ["ملاحظات", primaryCustomer?.notes ?? "لا توجد"]
        ],
        summary: [
          { label: "العميل", value: primaryCustomer?.name ?? "غير محدد" },
          { label: "الرصيد", value: formatCurrency(primaryCustomer?.balance ?? 0) },
          { label: "الأقساط", value: store.installments.filter((item) => item.customerId === primaryCustomer?.id).length }
        ]
      },
      "supplier-statement": {
        title: "كشف حساب مورد",
        subtitle: "ملخص افتراضي لمستحقات الموردين والمعارض الأخرى من بيانات الشراء الحالية.",
        headers: ["المورد", "عدد السيارات", "إجمالي المشتريات", "المستحق"],
        rows: Array.from(new Set(store.vehicles.map((vehicle) => vehicle.supplier))).map((supplier) => {
          const supplierVehicles = store.vehicles.filter((vehicle) => vehicle.supplier === supplier);
          const total = supplierVehicles.reduce((sum, vehicle) => sum + vehicle.purchasePrice, 0);
          return [supplier, supplierVehicles.length, formatCurrency(total), formatCurrency(0)];
        }),
        summary: [
          { label: "عدد الموردين", value: new Set(store.vehicles.map((vehicle) => vehicle.supplier)).size },
          { label: "إجمالي المشتريات", value: formatCurrency(store.vehicles.reduce((sum, vehicle) => sum + vehicle.purchasePrice, 0)) }
        ]
      },
      inventory: {
        title: "تقرير المخزون",
        subtitle: "السيارات الموجودة في كل الفروع مع الحالة والربح المتوقع.",
        headers: ["الرقم", "السيارة", "VIN", "الحالة", "الفرع", "سعر البيع", "الربح المتوقع"],
        rows: store.vehicles.map((vehicle) => [
          vehicle.internalNumber,
          `${vehicle.manufacturer} ${vehicle.model} ${vehicle.year}`,
          vehicle.vin,
          statusLabel(vehicle.status),
          vehicle.branch,
          formatCurrency(vehicle.salePrice),
          formatCurrency(vehicle.salePrice - vehicle.purchasePrice - vehicle.maintenanceCost - vehicle.transportationCost)
        ]),
        summary: [
          { label: "عدد السيارات", value: formatNumber(store.vehicles.length) },
          { label: "قيمة المخزون", value: formatCurrency(metrics.inventoryValue) },
          { label: "الربح المتوقع", value: formatCurrency(metrics.expectedProfit) }
        ]
      },
      sales: {
        title: "تقرير المبيعات",
        subtitle: "الفواتير الصادرة وحالة البيع وربطها بالعميل والسيارة.",
        headers: ["رقم الفاتورة", "العميل", "السيارة", "طريقة الدفع", "الإجمالي", "الخصم", "التاريخ"],
        rows: store.invoices.map((invoice) => {
          const customer = store.customers.find((item) => item.id === invoice.customerId);
          const vehicle = store.vehicles.find((item) => item.id === invoice.vehicleId);
          return [
            invoice.id,
            customer?.name ?? "غير معروف",
            vehicle ? `${vehicle.manufacturer} ${vehicle.model}` : "غير معروف",
            invoice.type,
            formatCurrency(invoice.total),
            formatCurrency(invoice.discount),
            formatDateTime(invoice.createdAt)
          ];
        }),
        summary: [
          { label: "عدد الفواتير", value: formatNumber(store.invoices.length) },
          { label: "إجمالي المبيعات", value: formatCurrency(metrics.totalSales) },
          { label: "السيارات المباعة", value: formatNumber(metrics.sold) }
        ]
      },
      "profit-loss": {
        title: "تقرير الأرباح والخسائر",
        subtitle: "ملخص الإيرادات والمصروفات والربح المتوقع.",
        headers: ["البند", "المبلغ"],
        rows: [
          ["إجمالي المبيعات", formatCurrency(metrics.totalSales)],
          ["إجمالي المصروفات", formatCurrency(metrics.expenses)],
          ["قيمة المخزون", formatCurrency(metrics.inventoryValue)],
          ["الربح المتوقع", formatCurrency(metrics.expectedProfit)],
          ["صافي الربح الحالي", formatCurrency(metrics.totalSales - metrics.expenses)]
        ],
        summary: [
          { label: "المبيعات", value: formatCurrency(metrics.totalSales) },
          { label: "المصروفات", value: formatCurrency(metrics.expenses) },
          { label: "الصافي", value: formatCurrency(metrics.totalSales - metrics.expenses) }
        ]
      },
      installments: {
        title: "تقرير الأقساط",
        subtitle: "الأقساط المدفوعة والمتأخرة والمستحقة حسب العملاء والسيارات.",
        headers: ["رقم القسط", "العميل", "السيارة", "تاريخ الاستحقاق", "المبلغ", "المدفوع", "الحالة"],
        rows: store.installments.map((installment) => {
          const customer = store.customers.find((item) => item.id === installment.customerId);
          const vehicle = store.vehicles.find((item) => item.id === installment.vehicleId);
          return [
            installment.id,
            customer?.name ?? "غير معروف",
            vehicle ? `${vehicle.manufacturer} ${vehicle.model}` : "غير معروف",
            formatDateTime(installment.dueDate),
            formatCurrency(installment.amount),
            formatCurrency(installment.paidAmount),
            statusCopy[installment.status] ?? installment.status
          ];
        }),
        summary: [
          { label: "الأقساط المستحقة اليوم", value: formatNumber(metrics.todaysInstallments) },
          { label: "الأقساط المتأخرة", value: formatNumber(metrics.overdueInstallments) },
          { label: "إجمالي الأقساط", value: formatNumber(store.installments.length) }
        ]
      },
      customers: {
        title: "تقرير العملاء",
        subtitle: "بيانات العملاء والأرصدة وسجل الشراء.",
        headers: ["العميل", "الهاتف", "البريد", "العنوان", "الرصيد", "عدد المشتريات"],
        rows: store.customers.map((customer) => [
          customer.name,
          customer.phone,
          customer.email,
          customer.address,
          formatCurrency(customer.balance),
          customer.purchases
        ]),
        summary: [
          { label: "عدد العملاء", value: formatNumber(store.customers.length) },
          { label: "إجمالي أرصدة العملاء", value: formatCurrency(store.customers.reduce((sum, customer) => sum + customer.balance, 0)) }
        ]
      },
      expenses: {
        title: "تقرير المصروفات",
        subtitle: "المصروفات المسجلة حسب الفئة والفرع.",
        headers: ["الفئة", "الوصف", "الفرع", "المبلغ", "التاريخ"],
        rows: store.expenses.map((expense) => [
          expense.category,
          expense.description,
          expense.branch,
          formatCurrency(expense.amount),
          formatDateTime(expense.createdAt)
        ]),
        summary: [
          { label: "عدد المصروفات", value: formatNumber(store.expenses.length) },
          { label: "إجمالي المصروفات", value: formatCurrency(metrics.expenses) }
        ]
      },
      "available-cars": {
        title: "تقرير السيارات المتوفرة",
        subtitle: "السيارات الجاهزة للبيع حالياً.",
        headers: ["الرقم", "السيارة", "VIN", "الفرع", "سعر البيع"],
        rows: availableVehicles.map((vehicle) => [
          vehicle.internalNumber,
          `${vehicle.manufacturer} ${vehicle.model} ${vehicle.year}`,
          vehicle.vin,
          vehicle.branch,
          formatCurrency(vehicle.salePrice)
        ]),
        summary: [
          { label: "عدد السيارات المتوفرة", value: formatNumber(availableVehicles.length) },
          { label: "إجمالي القيمة", value: formatCurrency(availableVehicles.reduce((sum, vehicle) => sum + vehicle.salePrice, 0)) }
        ]
      },
      "sold-cars": {
        title: "تقرير السيارات المباعة",
        subtitle: "السيارات التي تم اعتماد بيعها.",
        headers: ["الرقم", "السيارة", "VIN", "الفرع", "سعر البيع"],
        rows: soldVehicles.map((vehicle) => [
          vehicle.internalNumber,
          `${vehicle.manufacturer} ${vehicle.model} ${vehicle.year}`,
          vehicle.vin,
          vehicle.branch,
          formatCurrency(vehicle.salePrice)
        ]),
        summary: [
          { label: "عدد السيارات المباعة", value: formatNumber(soldVehicles.length) },
          { label: "إجمالي قيمة البيع", value: formatCurrency(soldVehicles.reduce((sum, vehicle) => sum + vehicle.salePrice, 0)) }
        ]
      },
      "reserved-cars": {
        title: "تقرير السيارات المحجوزة",
        subtitle: "السيارات المحجوزة مع قيمتها وموقعها.",
        headers: ["الرقم", "السيارة", "VIN", "الفرع", "سعر البيع"],
        rows: reservedVehicles.map((vehicle) => [
          vehicle.internalNumber,
          `${vehicle.manufacturer} ${vehicle.model} ${vehicle.year}`,
          vehicle.vin,
          vehicle.branch,
          formatCurrency(vehicle.salePrice)
        ]),
        summary: [
          { label: "عدد السيارات المحجوزة", value: formatNumber(reservedVehicles.length) },
          { label: "إجمالي القيمة", value: formatCurrency(reservedVehicles.reduce((sum, vehicle) => sum + vehicle.salePrice, 0)) }
        ]
      },
      "paid-installments": {
        title: "تقرير الأقساط المدفوعة",
        subtitle: "الأقساط التي تم تسجيل دفعها.",
        headers: ["رقم القسط", "العميل", "المبلغ", "المدفوع", "تاريخ الاستحقاق"],
        rows: paidInstallments.map((installment) => {
          const customer = store.customers.find((item) => item.id === installment.customerId);
          return [installment.id, customer?.name ?? "غير معروف", formatCurrency(installment.amount), formatCurrency(installment.paidAmount), formatDateTime(installment.dueDate)];
        }),
        summary: [
          { label: "عدد الأقساط المدفوعة", value: formatNumber(paidInstallments.length) },
          { label: "إجمالي المدفوع", value: formatCurrency(paidInstallments.reduce((sum, item) => sum + item.paidAmount, 0)) }
        ]
      },
      "overdue-installments": {
        title: "تقرير الأقساط المتأخرة",
        subtitle: "الأقساط التي تحتاج متابعة فورية.",
        headers: ["رقم القسط", "العميل", "المبلغ", "المدفوع", "تاريخ الاستحقاق"],
        rows: overdueInstallments.map((installment) => {
          const customer = store.customers.find((item) => item.id === installment.customerId);
          return [installment.id, customer?.name ?? "غير معروف", formatCurrency(installment.amount), formatCurrency(installment.paidAmount), formatDateTime(installment.dueDate)];
        }),
        summary: [
          { label: "عدد الأقساط المتأخرة", value: formatNumber(overdueInstallments.length) },
          { label: "إجمالي المتأخر", value: formatCurrency(overdueInstallments.reduce((sum, item) => sum + Math.max(item.amount - item.paidAmount, 0), 0)) }
        ]
      },
      employees: {
        title: "تقرير الموظفين",
        subtitle: "أداء الموظفين والعمولات والعمليات المسجلة.",
        headers: ["الموظف", "الدور", "الفرع", "المبيعات", "العمولة"],
        rows: [
          ["سارة ن.", "موظف مبيعات", "Main Showroom", formatCurrency(48900), formatCurrency(950)],
          ["علي ر.", "موظف مبيعات", "Airport Branch", formatCurrency(23600), formatCurrency(420)],
          ["المحاسب", "محاسب", "Main Showroom", formatCurrency(metrics.totalSales), formatCurrency(0)]
        ],
        summary: [
          { label: "أفضل موظف", value: "سارة ن." },
          { label: "إجمالي المبيعات", value: formatCurrency(metrics.totalSales) }
        ]
      },
      branches: {
        title: "تقرير الفروع",
        subtitle: "ملخص السيارات والمبيعات والأرباح حسب الفرع.",
        headers: ["الفرع", "عدد السيارات", "قيمة المخزون", "سيارات محجوزة", "سيارات مباعة"],
        rows: ["Main Showroom", "Airport Branch"].map((branch) => {
          const branchVehicles = store.vehicles.filter((vehicle) => vehicle.branch === branch);
          return [
            branch,
            branchVehicles.length,
            formatCurrency(branchVehicles.reduce((sum, vehicle) => sum + vehicle.purchasePrice, 0)),
            branchVehicles.filter((vehicle) => vehicle.status === "reserved").length,
            branchVehicles.filter((vehicle) => vehicle.status === "sold").length
          ];
        }),
        summary: [
          { label: "عدد الفروع", value: "2" },
          { label: "إجمالي السيارات", value: formatNumber(store.vehicles.length) }
        ]
      },
      maintenance: {
        title: "تقرير الصيانة",
        subtitle: "تكاليف الصيانة المسجلة على السيارات.",
        headers: ["السيارة", "الحالة", "تكلفة الصيانة", "الملاحظات"],
        rows: store.vehicles.map((vehicle) => [
          `${vehicle.manufacturer} ${vehicle.model}`,
          statusLabel(vehicle.status),
          formatCurrency(vehicle.maintenanceCost),
          vehicle.status === "maintenance" ? "قيد الصيانة حالياً" : "لا توجد ملاحظة حرجة"
        ]),
        summary: [
          { label: "إجمالي الصيانة", value: formatCurrency(store.vehicles.reduce((sum, vehicle) => sum + vehicle.maintenanceCost, 0)) },
          { label: "سيارات بالصيانة", value: formatNumber(store.vehicles.filter((vehicle) => vehicle.status === "maintenance").length) }
        ]
      },
      insurance: {
        title: "تقرير التأمين والمستندات",
        subtitle: "ملخص مستندات السيارات والتأمين والفحص.",
        headers: ["السيارة", "عدد الصور", "عدد المستندات", "تنبيه"],
        rows: store.vehicles.map((vehicle) => [
          `${vehicle.manufacturer} ${vehicle.model}`,
          vehicle.photos,
          vehicle.documents,
          vehicle.documents === 0 ? "يحتاج رفع مستندات" : "مكتمل مبدئياً"
        ]),
        summary: [
          { label: "إجمالي المستندات", value: formatNumber(store.vehicles.reduce((sum, vehicle) => sum + vehicle.documents, 0)) },
          { label: "إجمالي الصور", value: formatNumber(store.vehicles.reduce((sum, vehicle) => sum + vehicle.photos, 0)) }
        ]
      },
      "cars-table": {
        title: "جدول السيارات",
        subtitle: "جدول تشغيلي لطباعة أو تصدير السيارات.",
        headers: ["الرقم", "الشركة", "الموديل", "السنة", "الحالة", "الفرع"],
        rows: store.vehicles.map((vehicle) => [
          vehicle.internalNumber,
          vehicle.manufacturer,
          vehicle.model,
          vehicle.year,
          statusLabel(vehicle.status),
          vehicle.branch
        ]),
        summary: [{ label: "عدد السجلات", value: formatNumber(store.vehicles.length) }]
      },
      "customers-table": {
        title: "جدول العملاء",
        subtitle: "جدول تشغيلي لطباعة أو تصدير العملاء.",
        headers: ["العميل", "الهاتف", "البريد", "العنوان"],
        rows: store.customers.map((customer) => [customer.name, customer.phone, customer.email, customer.address]),
        summary: [{ label: "عدد السجلات", value: formatNumber(store.customers.length) }]
      },
      "sales-table": {
        title: "جدول المبيعات",
        subtitle: "جدول تشغيلي لطباعة أو تصدير المبيعات.",
        headers: ["الفاتورة", "العميل", "الإجمالي", "الحالة"],
        rows: store.invoices.map((invoice) => {
          const customer = store.customers.find((item) => item.id === invoice.customerId);
          return [invoice.id, customer?.name ?? "غير معروف", formatCurrency(invoice.total), invoice.status];
        }),
        summary: [{ label: "عدد السجلات", value: formatNumber(store.invoices.length) }]
      },
      "installments-table": {
        title: "جدول الأقساط",
        subtitle: "جدول تشغيلي لطباعة أو تصدير الأقساط.",
        headers: ["القسط", "المبلغ", "المدفوع", "الحالة"],
        rows: store.installments.map((item) => [item.id, formatCurrency(item.amount), formatCurrency(item.paidAmount), statusCopy[item.status] ?? item.status]),
        summary: [{ label: "عدد السجلات", value: formatNumber(store.installments.length) }]
      },
      "expenses-table": {
        title: "جدول المصروفات",
        subtitle: "جدول تشغيلي لطباعة أو تصدير المصروفات.",
        headers: ["الفئة", "الوصف", "الفرع", "المبلغ"],
        rows: store.expenses.map((expense) => [expense.category, expense.description, expense.branch, formatCurrency(expense.amount)]),
        summary: [{ label: "عدد السجلات", value: formatNumber(store.expenses.length) }]
      },
      "employees-table": {
        title: "جدول الموظفين",
        subtitle: "جدول تشغيلي لطباعة أو تصدير الموظفين.",
        headers: ["الموظف", "الدور", "الفرع", "الأداء"],
        rows: [
          ["سارة ن.", "موظف مبيعات", "Main Showroom", "ممتاز"],
          ["علي ر.", "موظف مبيعات", "Airport Branch", "جيد"],
          ["المحاسب", "محاسب", "Main Showroom", "مستقر"]
        ],
        summary: [{ label: "عدد السجلات", value: "3" }]
      },
      "branches-table": {
        title: "جدول الفروع",
        subtitle: "جدول تشغيلي لطباعة أو تصدير الفروع.",
        headers: ["الفرع", "عدد السيارات", "سيارات متاحة", "سيارات محجوزة"],
        rows: ["Main Showroom", "Airport Branch"].map((branch) => {
          const branchVehicles = store.vehicles.filter((vehicle) => vehicle.branch === branch);
          return [
            branch,
            branchVehicles.length,
            branchVehicles.filter((vehicle) => vehicle.status === "available").length,
            branchVehicles.filter((vehicle) => vehicle.status === "reserved").length
          ];
        }),
        summary: [{ label: "عدد الفروع", value: "2" }]
      }
    }),
    [
      availableVehicles,
      metrics,
      overdueInstallments,
      paidInstallments,
      primaryCustomer,
      primaryInstallment,
      primaryInvoice,
      primaryReservation,
      primaryVehicle,
      reservedVehicles,
      soldVehicles,
      store.customers,
      store.expenses,
      store.installments,
      store.invoices,
      store.vehicles
    ]
  );

  const activeReport = printableReports[activeReportKey];
  const filteredVehicles = useMemo(() => {
    const query = vehicleSearch.trim().toLowerCase();
    return store.vehicles.filter((vehicle) => {
      const matchesStatus = vehicleStatusFilter === "all" || vehicle.status === vehicleStatusFilter;
      const matchesQuery =
        query.length === 0 ||
        [
          vehicle.internalNumber,
          vehicle.vin,
          vehicle.plateNumber,
          vehicle.manufacturer,
          vehicle.model,
          vehicle.trim,
          vehicle.branch
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [store.vehicles, vehicleSearch, vehicleStatusFilter]);
  const totalVehiclePages = Math.max(1, Math.ceil(filteredVehicles.length / 5));
  const visibleVehicles = filteredVehicles.slice((vehiclePage - 1) * 5, vehiclePage * 5);

  function log(message: string) {
    setActionLog((items) => [message, ...items].slice(0, 8));
  }

  function createTextDownload(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const rows = [
      activeReport.headers,
      ...activeReport.rows
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    createTextDownload(`baraa-raed-${activeReportKey}.csv`, csv, "text/csv");
    log(`تم تصدير ${activeReport.title} بصيغة CSV لاستخدامه في Excel.`);
  }

  function exportPdf() {
    const tableRows = activeReport.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
      .join("");
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" /><title>${activeReport.title}</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #ddd;padding:10px;text-align:right}th{background:#111;color:#d6a84f}.summary{display:flex;gap:12px;margin-top:20px}.summary div{border:1px solid #ddd;padding:10px;border-radius:10px}</style></head><body><h1>${activeReport.title}</h1><p>${activeReport.subtitle}</p><div class="summary">${activeReport.summary
      .map((item) => `<div><strong>${item.label}</strong><br/>${item.value}</div>`)
      .join("")}</div><table><thead><tr>${activeReport.headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    createTextDownload(`baraa-raed-${activeReportKey}-print.html`, html, "text/html");
    log(`تم تنزيل ${activeReport.title} كملف HTML قابل للطباعة أو الحفظ PDF.`);
  }

  function printCenter() {
    setPrintTimestamp(new Date().toISOString());
    document.getElementById("print-center")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => window.print(), 350);
    log(`تم فتح ورقة الطباعة لتقرير: ${activeReport.title}.`);
  }

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function runModuleAction(moduleKey: ModuleKey, capability: string) {
    const actionId = `${moduleKey}-${capability}`;
    if (loadingAction) {
      return;
    }

    setLoadingAction(actionId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 180));

      if (moduleKey === "cars" || capability.includes("سيارة") || capability.includes("VIN")) {
        scrollToSection("vehicle-form");
        log("تم فتح نموذج السيارات وجدول المخزون لتنفيذ الإجراء.");
        return;
      }

      if (moduleKey === "customers" || capability.includes("العميل")) {
        scrollToSection("customer-form");
        log("تم فتح نموذج العملاء وكشف الحساب.");
        return;
      }

      if (moduleKey === "sales" || capability.includes("فاتورة") || capability.includes("بيع")) {
        setActiveReportKey("invoice");
        scrollToSection("sales-form");
        log("تم فتح نموذج فاتورة البيع وتجهيز قالب الفاتورة للطباعة.");
        return;
      }

      if (moduleKey === "installments" || capability.includes("قسط") || capability.includes("إيصال")) {
        setActiveReportKey("installment-contract");
        scrollToSection("installment-form");
        log("تم فتح التقسيط وتجهيز عقد التقسيط للطباعة.");
        return;
      }

      if (moduleKey === "reports" || capability.includes("PDF") || capability.includes("Excel")) {
        setActiveReportKey(capability.includes("Excel") ? "cars-table" : "sales");
        scrollToSection("print-center");
        log("تم فتح مركز التقارير والطباعة.");
        return;
      }

      if (moduleKey === "printing" || capability.includes("طباعة") || capability.includes("A4")) {
        scrollToSection("print-center");
        log("تم فتح مركز الطباعة مع ورقة A4.");
        return;
      }

      if (moduleKey === "accounting") {
        setActiveReportKey("profit-loss");
        scrollToSection("print-center");
        log("تم تجهيز تقرير الأرباح والخسائر.");
        return;
      }

      if (moduleKey === "employees") {
        setActiveReportKey("employees");
        scrollToSection("print-center");
        log("تم تجهيز تقرير الموظفين.");
        return;
      }

      if (moduleKey === "branches") {
        setActiveReportKey("branches");
        scrollToSection("print-center");
        log("تم تجهيز تقرير الفروع.");
        return;
      }

      if (moduleKey === "purchases" || capability.includes("مورد")) {
        setActiveReportKey("supplier-statement");
        scrollToSection("print-center");
        log("تم تجهيز كشف حساب الموردين.");
        return;
      }

      if (moduleKey === "inventory") {
        setActiveReportKey("inventory");
        scrollToSection("inventory-table");
        log("تم فتح جدول المخزون مع البحث والفلترة.");
        return;
      }

      if (moduleKey === "backup-sync" || capability.includes("مزامنة")) {
        await store.synchronize();
        log("تم تنفيذ المزامنة أو التحقق من الطابور.");
        return;
      }

      if (moduleKey === "whatsapp") {
        shareWhatsApp();
        return;
      }

      scrollToSection("print-center");
      log("تم فتح القسم المناسب للإجراء داخل النظام الحالي.");
    } catch (error) {
      log(error instanceof Error ? `فشل تنفيذ الإجراء: ${error.message}` : "فشل تنفيذ الإجراء.");
    } finally {
      setLoadingAction(null);
    }
  }

  function shareWhatsApp() {
    const vehicle = store.vehicles[0];
    const message = encodeURIComponent(
      `عرض سيارة من براء رائد: ${vehicle.manufacturer} ${vehicle.model} ${vehicle.year} - ${formatCurrency(
        vehicle.salePrice
      )}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
    log("تم فتح رابط المشاركة عبر واتساب.");
  }

  function backupJson() {
    createTextDownload(
      "baraa-raed-backup.json",
      JSON.stringify(
        {
          vehicles: store.vehicles,
          customers: store.customers,
          leads: store.leads,
          reservations: store.reservations,
          invoices: store.invoices,
          exportedAt: new Date().toISOString()
        },
        null,
        2
      ),
      "application/json"
    );
    log("تم تنزيل نسخة احتياطية محلية بصيغة JSON.");
  }

  const selectedModule = modules.find((module) => module.key === store.selectedModule) ?? modules[0];
  const selectedModuleCopy = arabicModuleCopy[selectedModule.key];

  return (
    <main className={cn("min-h-screen px-4 py-5 sm:px-6 lg:px-8", rtl && "rtl-support")}>
      <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[290px_1fr]">
        <aside className="luxury-panel sticky top-5 h-fit rounded-[2rem] p-4">
          <BrandLogo />
          <div className="mt-5 grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => setRtl((value) => !value)}>{rtl ? "اتجاه LTR" : "اتجاه RTL"}</SecondaryButton>
            <SecondaryButton onClick={() => store.setNetworkStatus(store.syncStatus === "offline")}>
              {store.syncStatus === "offline" ? "تشغيل الاتصال" : "وضع بدون إنترنت"}
            </SecondaryButton>
          </div>
          <nav className="mt-5 max-h-[68vh] space-y-1 overflow-auto pr-1">
            {mainMenuKeys.map((moduleKey) => {
              const menuItem = modules.find((item) => item.key === moduleKey);
              if (!menuItem) {
                return null;
              }

              return (
              <button
                type="button"
                key={menuItem.key}
                onClick={() => store.setSelectedModule(menuItem.key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition",
                  store.selectedModule === menuItem.key
                    ? "border border-[#d6a84f]/45 bg-[#d6a84f]/15 text-[#f3c96b]"
                    : "text-white/68 hover:bg-white/8 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2">
                  {moduleIcons[menuItem.key]}
                  {arabicModuleCopy[menuItem.key].title}
                </span>
                <span className="text-xs text-white/35">براء رائد</span>
              </button>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-5">
          <header className="luxury-panel overflow-hidden rounded-[2rem] p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-[#d6a84f]">Baraa Raed | نظام مملوك بالكامل للمعرض</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
                  براء رائد <span className="gold-text">لإدارة معارض السيارات</span>
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-white/65">
                  نظام عربي احترافي لإدارة السيارات والعملاء والمبيعات والتقسيط والمشتريات والمخزون والمحاسبة
                  والموظفين والفروع والتقارير، يعمل على الويب والموبايل وويندوز بدون اشتراكات ويدعم العمل بدون
                  إنترنت مع المزامنة التلقائية.
                </p>
              </div>
              <div className="grid min-w-[280px] gap-3 rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-white/70">
                    {store.syncStatus === "offline" ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                    حالة المزامنة
                  </span>
                  <StatusBadge status={store.syncStatus} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">العمليات المعلقة</span>
                  <strong>{store.pendingOperations.length}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">آخر مزامنة</span>
                  <strong>{store.lastSyncAt ? formatDateTime(store.lastSyncAt) : "لم تتم المزامنة"}</strong>
                </div>
                <PrimaryButton onClick={() => void store.synchronize()} disabled={store.syncStatus === "offline"}>
                  <span className="inline-flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    مزامنة الآن
                  </span>
                </PrimaryButton>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["السيارات المتاحة", metrics.available, <Car key="icon" className="h-5 w-5" />],
              ["إجمالي المبيعات", formatCurrency(metrics.totalSales), <Receipt key="icon" className="h-5 w-5" />],
              ["الربح المتوقع", formatCurrency(metrics.expectedProfit), <BadgeDollarSign key="icon" className="h-5 w-5" />],
              ["الأقساط المتأخرة", metrics.overdueInstallments, <AlertTriangle key="icon" className="h-5 w-5" />],
              ["العملاء", store.customers.length, <Users key="icon" className="h-5 w-5" />],
              ["العملاء المحتملون", store.leads.length, <UserRoundPlus key="icon" className="h-5 w-5" />],
              ["السيارات المحجوزة", metrics.reserved, <CheckCircle2 key="icon" className="h-5 w-5" />],
              ["قيمة المخزون", formatCurrency(metrics.inventoryValue), <PackageCheck key="icon" className="h-5 w-5" />]
            ].map(([label, value, icon]) => (
              <motion.article
                key={label.toString()}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="luxury-panel rounded-3xl p-5"
              >
                <div className="flex items-center justify-between text-[#d6a84f]">
                  {icon}
                  <span className="text-xs uppercase tracking-[0.25em] text-white/35">مباشر</span>
                </div>
                <p className="mt-4 text-sm text-white/55">{label}</p>
                <p className="mt-2 text-3xl font-black text-white">{value}</p>
              </motion.article>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
            <div className="luxury-panel rounded-[2rem] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#d6a84f]">الموديول الحالي</p>
                  <h2 className="mt-2 text-2xl font-black">{selectedModuleCopy.title}</h2>
                  <p className="mt-1 text-sm text-white/55">{selectedModuleCopy.description}</p>
                </div>
                <span className="rounded-full border border-[#d6a84f]/40 bg-[#d6a84f]/10 px-3 py-1 text-xs font-semibold text-[#f3c96b]">
                  {selectedModuleCopy.title}
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {selectedModuleCopy.capabilities.map((capability) => (
                  <button
                    type="button"
                    key={capability}
                    onClick={() => void runModuleAction(selectedModule.key, capability)}
                    disabled={loadingAction === `${selectedModule.key}-${capability}`}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-[#d6a84f]/60 hover:bg-[#d6a84f]/10"
                  >
                    <span className="text-sm font-bold text-white">
                      {loadingAction === `${selectedModule.key}-${capability}` ? "جاري التنفيذ..." : capability}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-white/45">
                      يفتح القسم المرتبط أو يجهز التقرير/النموذج المطلوب مباشرة.
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="luxury-panel rounded-[2rem] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-[#d6a84f]">إجراءات سريعة</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SecondaryButton onClick={shareWhatsApp}>مشاركة واتساب</SecondaryButton>
                <SecondaryButton onClick={exportPdf}>تصدير PDF</SecondaryButton>
                <SecondaryButton onClick={exportExcel}>تصدير Excel</SecondaryButton>
                <SecondaryButton onClick={printCenter}>مركز الطباعة</SecondaryButton>
                <SecondaryButton onClick={backupJson}>نسخة احتياطية</SecondaryButton>
                <SecondaryButton onClick={() => store.attachLocalFile(selectedModuleCopy.title)}>إضافة ملف للطابور</SecondaryButton>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm font-bold text-white">التثبيت والأجهزة</p>
                <div className="mt-3 grid gap-2 text-sm text-white/55">
                  <span className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-[#d6a84f]" />
                    قابل للتثبيت على كروم وإيدج وسفاري وأندرويد وآيفون وويندوز.
                  </span>
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#d6a84f]" />
                    مجهز للمصادقة والصلاحيات حسب الفرع وسجلات التدقيق.
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section id="print-center" className="luxury-panel rounded-[2rem] p-5">
            <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#d6a84f]">مركز الطباعة والتقارير</p>
                <h3 className="mt-2 text-2xl font-black">ورقة طباعة ظاهرة وجاهزة</h3>
                <p className="mt-1 text-sm text-white/55">
                  اختر التقرير، ثم اطبعه مباشرة أو نزله كملف قابل للحفظ PDF أو CSV لبرنامج Excel.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton onClick={printCenter}>طباعة التقرير</PrimaryButton>
                <SecondaryButton onClick={exportPdf}>تنزيل PDF / HTML</SecondaryButton>
                <SecondaryButton onClick={exportExcel}>تنزيل Excel</SecondaryButton>
              </div>
            </div>

            <div className="no-print mt-5 flex flex-wrap gap-2">
              {reportTabs.map((report) => (
                <button
                  type="button"
                  key={report.key}
                  onClick={() => {
                    setActiveReportKey(report.key);
                    setPrintTimestamp(new Date().toISOString());
                    log(`تم اختيار ${report.title} للطباعة.`);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    activeReportKey === report.key
                      ? "border-[#d6a84f]/70 bg-[#d6a84f]/15 text-[#f3c96b]"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-[#d6a84f]/50"
                  )}
                >
                  {report.title}
                </button>
              ))}
            </div>

            <article
              id="print-sheet"
              className="mt-6 min-h-[720px] rounded-[1.5rem] bg-white p-6 text-[#111827] shadow-2xl print:shadow-none"
            >
              <header className="flex flex-col gap-4 border-b-2 border-[#d6a84f] pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#96703a]">Baraa Raed Car Showroom Management System</p>
                  <h2 className="mt-1 text-3xl font-black">براء رائد لإدارة معارض السيارات</h2>
                  <p className="mt-2 text-sm text-gray-600">العنوان: بغداد - الهاتف: +964 770 000 0000</p>
                </div>
                <div className="rounded-2xl border border-[#d6a84f] px-4 py-3 text-sm">
                  <div>تاريخ الطباعة: {formatDateTime(printTimestamp)}</div>
                  <div>المستخدم: المدير العام</div>
                  <div>نوع التقرير: {activeReport.title}</div>
                </div>
              </header>

              <section className="mt-6">
                <h1 className="text-2xl font-black">{activeReport.title}</h1>
                <p className="mt-2 text-sm text-gray-600">{activeReport.subtitle}</p>
              </section>

              <section className="mt-6 grid gap-3 sm:grid-cols-3">
                {activeReport.summary.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="mt-1 text-lg font-black">{item.value}</p>
                  </div>
                ))}
              </section>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#111827] text-[#f3c96b]">
                      {activeReport.headers.map((header) => (
                        <th key={header} className="border border-gray-300 p-3 text-right">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeReport.rows.map((row, rowIndex) => (
                      <tr key={`${activeReportKey}-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${activeReportKey}-${rowIndex}-${cellIndex}`} className="border border-gray-300 p-3">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <footer className="mt-8 grid gap-6 border-t border-gray-200 pt-6 text-sm sm:grid-cols-2">
                <div>
                  <p className="font-bold">توقيع المدير</p>
                  <div className="mt-10 border-t border-gray-400 pt-2">الاسم والتوقيع</div>
                </div>
                <div>
                  <p className="font-bold">ختم الشركة</p>
                  <div className="mt-10 border-t border-gray-400 pt-2">Baraa Raed</div>
                </div>
              </footer>
            </article>
          </section>

          <section className="grid gap-5 2xl:grid-cols-2">
            <form
              id="vehicle-form"
              className="luxury-panel rounded-[2rem] p-5"
              onSubmit={vehicleForm.handleSubmit((data) => {
                const parsed = vehicleSchema.safeParse(data);
                if (!parsed.success) {
                  log(parsed.error.issues[0]?.message ?? "فشل التحقق من بيانات السيارة.");
                  return;
                }
                const result = store.addVehicle(parsed.data);
                log(result.ok ? `تمت إضافة السيارة ${result.vehicle.internalNumber} محلياً.` : result.message);
              })}
            >
              <h3 className="text-xl font-black">إضافة سيارة</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {([
                  ["internalNumber", "الرقم الداخلي"],
                  ["vin", "VIN"],
                  ["plateNumber", "رقم اللوحة"],
                  ["manufacturer", "الشركة المصنعة"],
                  ["model", "الموديل"],
                  ["trim", "الفئة"],
                  ["year", "السنة"],
                  ["exteriorColor", "اللون الخارجي"],
                  ["interiorColor", "اللون الداخلي"],
                  ["fuelType", "نوع الوقود"],
                  ["transmission", "ناقل الحركة"],
                  ["mileage", "المسافة المقطوعة"],
                  ["purchasePrice", "سعر الشراء"],
                  ["salePrice", "سعر البيع"],
                  ["minimumSalePrice", "أقل سعر بيع"],
                  ["maintenanceCost", "تكلفة الصيانة"],
                  ["transportationCost", "تكلفة النقل"],
                  ["branch", "الفرع"],
                  ["supplier", "المورد"]
                ] as Array<[keyof VehicleInput, string]>).map(([name, label]) => (
                  <Field key={name} label={label}>
                    <input className={inputClass} {...vehicleForm.register(name)} />
                  </Field>
                ))}
              </div>
              <div className="mt-4">
                <PrimaryButton type="submit">إضافة السيارة</PrimaryButton>
              </div>
            </form>

            <div className="space-y-5">
              <form
                id="customer-form"
                className="luxury-panel rounded-[2rem] p-5"
                onSubmit={customerForm.handleSubmit((data) => {
                  const parsed = customerSchema.safeParse(data);
                  if (!parsed.success) {
                    log(parsed.error.issues[0]?.message ?? "فشل التحقق من بيانات العميل.");
                    return;
                  }
                  const customer = store.addCustomer(parsed.data);
                  log(`تمت إضافة العميل ${customer.name} محلياً.`);
                })}
              >
                <h3 className="text-xl font-black">إضافة عميل</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {([
                    ["name", "الاسم"],
                    ["phone", "الهاتف"],
                    ["email", "البريد الإلكتروني"],
                    ["address", "العنوان"],
                    ["idNumber", "رقم الهوية"],
                    ["notes", "ملاحظات"]
                  ] as Array<[keyof CustomerInput, string]>).map(([name, label]) => (
                    <Field key={name} label={label}>
                      <input className={inputClass} {...customerForm.register(name)} />
                    </Field>
                  ))}
                </div>
                <div className="mt-4">
                  <PrimaryButton type="submit">إضافة العميل</PrimaryButton>
                </div>
              </form>

              <form
                id="lead-form"
                className="luxury-panel rounded-[2rem] p-5"
                onSubmit={leadForm.handleSubmit((data) => {
                  const parsed = leadSchema.safeParse(data);
                  if (!parsed.success) {
                    log(parsed.error.issues[0]?.message ?? "فشل التحقق من بيانات العميل المحتمل.");
                    return;
                  }
                  const lead = store.addLead(parsed.data);
                  log(`تم تسجيل العميل المحتمل ${lead.name} من ${lead.source}.`);
                })}
              >
                <h3 className="text-xl font-black">تسجيل عميل محتمل</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="الاسم">
                    <input className={inputClass} {...leadForm.register("name")} />
                  </Field>
                  <Field label="الهاتف">
                    <input className={inputClass} {...leadForm.register("phone")} />
                  </Field>
                  <Field label="المصدر">
                    <select className={inputClass} {...leadForm.register("source")}>
                      {["WhatsApp", "Facebook", "Instagram", "Walk-In", "Phone Call"].map((source) => (
                        <option key={source} value={source}>
                          {leadSourceCopy[source]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="الموظف المسؤول">
                    <input className={inputClass} {...leadForm.register("assignedTo")} />
                  </Field>
                  <Field label="السيارة">
                    <select className={inputClass} {...leadForm.register("vehicleId")}>
                      {store.vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.internalNumber} - {vehicle.manufacturer} {vehicle.model}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="ملاحظة">
                    <input className={inputClass} {...leadForm.register("note")} />
                  </Field>
                </div>
                <div className="mt-4">
                  <PrimaryButton type="submit">إنشاء العميل المحتمل</PrimaryButton>
                </div>
              </form>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <form
              id="reservation-form"
              className="luxury-panel rounded-[2rem] p-5"
              onSubmit={reservationForm.handleSubmit((data) => {
                const parsed = reservationSchema.safeParse(data);
                if (!parsed.success) {
                    log(parsed.error.issues[0]?.message ?? "فشل التحقق من بيانات الحجز.");
                  return;
                }
                const reservation = store.addReservation(parsed.data);
                log(`تم إنشاء الحجز ${reservation.id} وتحديث حالة السيارة إلى محجوزة.`);
              })}
            >
              <h3 className="text-lg font-black">الحجز</h3>
              <div className="mt-4 grid gap-3">
                <SelectVehicle register={reservationForm.register("vehicleId")} vehicles={store.vehicles} />
                <SelectCustomer register={reservationForm.register("customerId")} customers={store.customers} />
                <Field label="الموظف">
                  <input className={inputClass} {...reservationForm.register("employee")} />
                </Field>
                <Field label="العربون">
                  <input className={inputClass} {...reservationForm.register("deposit")} />
                </Field>
                <Field label="ينتهي في">
                  <input type="datetime-local" className={inputClass} {...reservationForm.register("expiresAt")} />
                </Field>
              </div>
              <div className="mt-4">
                <PrimaryButton type="submit">إنشاء الحجز</PrimaryButton>
              </div>
            </form>

            <form
              id="sales-form"
              className="luxury-panel rounded-[2rem] p-5"
              onSubmit={invoiceForm.handleSubmit((data) => {
                const parsed = invoiceSchema.safeParse(data);
                if (!parsed.success) {
                  log(parsed.error.issues[0]?.message ?? "فشل التحقق من بيانات الفاتورة.");
                  return;
                }
                const invoice = store.addInvoice(parsed.data);
                log(`تم إصدار الفاتورة ${invoice.id} مع القيد المحاسبي.`);
              })}
            >
              <h3 className="text-lg font-black">فاتورة البيع</h3>
              <div className="mt-4 grid gap-3">
                <SelectVehicle register={invoiceForm.register("vehicleId")} vehicles={store.vehicles} />
                <SelectCustomer register={invoiceForm.register("customerId")} customers={store.customers} />
                <Field label="نوع الدفع">
                  <select className={inputClass} {...invoiceForm.register("type")}>
                    <option value="cash">بيع نقدي</option>
                    <option value="bank-transfer">تحويل بنكي</option>
                    <option value="installment">بيع بالأقساط</option>
                    <option value="mixed">دفع مختلط</option>
                  </select>
                </Field>
                <Field label="الإجمالي">
                  <input className={inputClass} {...invoiceForm.register("total")} />
                </Field>
                <Field label="الخصم">
                  <input className={inputClass} {...invoiceForm.register("discount")} />
                </Field>
                <Field label="الضريبة">
                  <input className={inputClass} {...invoiceForm.register("tax")} />
                </Field>
              </div>
              <div className="mt-4">
                <PrimaryButton type="submit">إصدار الفاتورة</PrimaryButton>
              </div>
            </form>

            <div className="space-y-5">
              <form
                id="expense-form"
                className="luxury-panel rounded-[2rem] p-5"
                onSubmit={expenseForm.handleSubmit((data) => {
                  const parsed = expenseSchema.safeParse(data);
                  if (!parsed.success) {
                    log(parsed.error.issues[0]?.message ?? "فشل التحقق من بيانات المصروف.");
                    return;
                  }
                  const expense = store.addExpense(parsed.data);
                  log(`تم تسجيل مصروف ${expense.category}.`);
                })}
              >
                <h3 className="text-lg font-black">مصروف</h3>
                <div className="mt-4 grid gap-3">
                  <Field label="الفئة">
                    <input className={inputClass} {...expenseForm.register("category")} />
                  </Field>
                  <Field label="المبلغ">
                    <input className={inputClass} {...expenseForm.register("amount")} />
                  </Field>
                  <Field label="الفرع">
                    <input className={inputClass} {...expenseForm.register("branch")} />
                  </Field>
                  <Field label="الوصف">
                    <input className={inputClass} {...expenseForm.register("description")} />
                  </Field>
                </div>
                <div className="mt-4">
                  <PrimaryButton type="submit">تسجيل المصروف</PrimaryButton>
                </div>
              </form>

              <form
                id="installment-form"
                className="luxury-panel rounded-[2rem] p-5"
                onSubmit={paymentForm.handleSubmit((data) => {
                  const parsed = installmentPaymentSchema.safeParse(data);
                  if (!parsed.success) {
                    log(parsed.error.issues[0]?.message ?? "فشل التحقق من بيانات الدفعة.");
                    return;
                  }
                  store.recordInstallmentPayment(parsed.data);
                  log(`تم تسجيل دفعة قسط بقيمة ${formatCurrency(parsed.data.amount)}.`);
                })}
              >
                <h3 className="text-lg font-black">دفعة قسط</h3>
                <div className="mt-4 grid gap-3">
                  <Field label="القسط">
                    <select className={inputClass} {...paymentForm.register("installmentId")}>
                      {store.installments.map((installment) => (
                        <option key={installment.id} value={installment.id}>
                          {installment.id} - {formatCurrency(installment.amount)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="المبلغ">
                    <input className={inputClass} {...paymentForm.register("amount")} />
                  </Field>
                </div>
                <div className="mt-4">
                  <PrimaryButton type="submit">تسجيل الدفعة</PrimaryButton>
                </div>
              </form>
            </div>
          </section>

          <section id="inventory-table" className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
            <div className="luxury-panel rounded-[2rem] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-xl font-black">مخزون السيارات</h3>
                  <p className="mt-1 text-sm text-white/45">
                    جدول منظم مع بحث وفلترة وتصدير وطباعة، ويعرض {formatNumber(filteredVehicles.length)} من {formatNumber(store.vehicles.length)} سيارة.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton
                    onClick={() => {
                      setVehicleSearch("");
                      setVehicleStatusFilter("all");
                      log("تمت إعادة تعيين فلتر جدول السيارات.");
                    }}
                  >
                    إعادة تعيين الفلتر
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() => {
                      setActiveReportKey("cars-table");
                      scrollToSection("print-center");
                    }}
                  >
                    معاينة الطباعة
                  </SecondaryButton>
                  <SecondaryButton onClick={exportExcel}>Excel</SecondaryButton>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
                <Field label="بحث في السيارات">
                  <input
                    className={inputClass}
                    value={vehicleSearch}
                    onChange={(event) => {
                      setVehicleSearch(event.target.value);
                      setVehiclePage(1);
                    }}
                    placeholder="ابحث بالرقم، VIN، الشركة، الموديل، اللوحة..."
                  />
                </Field>
                <Field label="فلترة الحالة">
                  <select
                    className={inputClass}
                    value={vehicleStatusFilter}
                    onChange={(event) => {
                      setVehicleStatusFilter(event.target.value as "all" | Vehicle["status"]);
                      setVehiclePage(1);
                    }}
                  >
                    <option value="all">كل الحالات</option>
                    <option value="available">متاحة</option>
                    <option value="reserved">محجوزة</option>
                    <option value="sold">مباعة</option>
                    <option value="maintenance">صيانة</option>
                    <option value="not-ready">غير جاهزة</option>
                  </select>
                </Field>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="text-left text-white/45">
                    <tr>
                      <th className="py-3">الهوية</th>
                      <th>السيارة</th>
                      <th>السعر</th>
                      <th>الربح</th>
                      <th>الحالة</th>
                      <th>الفرع</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {visibleVehicles.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-white/55">
                          لا توجد سيارات مطابقة للبحث أو الفلتر الحالي.
                        </td>
                      </tr>
                    )}
                    {visibleVehicles.map((vehicle) => {
                      const profit =
                        vehicle.salePrice - vehicle.purchasePrice - vehicle.maintenanceCost - vehicle.transportationCost;
                      return (
                        <tr key={vehicle.id} className="align-top">
                          <td className="py-4">
                            <div className="font-bold text-white">{vehicle.internalNumber}</div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                              <QrCode className="h-3.5 w-3.5" />
                              {vehicle.vin}
                            </div>
                          </td>
                          <td>
                            <div className="font-bold">
                              {vehicle.manufacturer} {vehicle.model}
                            </div>
                            <div className="text-xs text-white/45">
                              {vehicle.trim} - {vehicle.year} - {vehicle.exteriorColor}
                            </div>
                          </td>
                          <td>{formatCurrency(vehicle.salePrice)}</td>
                          <td className={profit >= 0 ? "text-emerald-300" : "text-red-300"}>{formatCurrency(profit)}</td>
                          <td>
                            <StatusBadge status={vehicle.status} />
                          </td>
                          <td>{vehicle.branch}</td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              {(["available", "reserved", "sold", "maintenance", "not-ready"] as Vehicle["status"][]).map(
                                (status) => (
                                  <button
                                    type="button"
                                    key={status}
                                    onClick={() => {
                                      if (status === "sold" && !window.confirm("هل تريد تغيير حالة السيارة إلى مباعة؟")) {
                                        return;
                                      }
                                      store.updateVehicleStatus(vehicle.id, status);
                                      log(`تم تحديث حالة ${vehicle.internalNumber} إلى ${statusLabel(status)}.`);
                                    }}
                                    className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/60 hover:border-[#d6a84f]/50 hover:text-[#f3c96b]"
                                  >
                                    {statusLabel(status)}
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  صفحة {formatNumber(vehiclePage)} من {formatNumber(totalVehiclePages)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={vehiclePage <= 1}
                    onClick={() => setVehiclePage((page) => Math.max(1, page - 1))}
                    className="rounded-lg border border-white/10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    السابق
                  </button>
                  <button
                    type="button"
                    disabled={vehiclePage >= totalVehiclePages}
                    onClick={() => setVehiclePage((page) => Math.min(totalVehiclePages, page + 1))}
                    className="rounded-lg border border-white/10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    التالي
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="luxury-panel rounded-[2rem] p-5">
                <h3 className="text-xl font-black">مصفوفة الصلاحيات</h3>
                <div className="mt-4 space-y-3">
                  {permissionGroups.map((group) => (
                    <details key={group.role} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                      <summary className="cursor-pointer font-bold text-[#f3c96b]">{roleCopy[group.role]?.role ?? group.role}</summary>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/55">
                        {(roleCopy[group.role]?.permissions ?? group.permissions).map((permission) => (
                          <li key={permission}>{permission}</li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </div>

              <div className="luxury-panel rounded-[2rem] p-5">
                <h3 className="text-xl font-black">سجل الإجراءات</h3>
                <div className="mt-4 space-y-2">
                  {actionLog.map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/60">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <div className="luxury-panel rounded-[2rem] p-5">
              <h3 className="text-xl font-black">طابور المزامنة المعلق</h3>
              <div className="mt-4 space-y-2">
                {store.pendingOperations.length === 0 ? (
                  <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                    لا توجد عمليات معلقة. الجهاز متطابق مع آخر مزامنة.
                  </p>
                ) : (
                  store.pendingOperations.map((operation) => (
                    <div key={operation.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <strong>{operationCopy[operation.operation] ?? operation.operation}</strong>
                        <span className="text-xs text-white/45">{formatDateTime(operation.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-white/50">{operation.entityLabel}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="luxury-panel rounded-[2rem] p-5">
              <h3 className="text-xl font-black">التنبيهات</h3>
              <div className="mt-4 space-y-3">
                <AlertCard tone="warning" text={`${metrics.overdueInstallments} قسط متأخر يحتاج متابعة.`} />
                <AlertCard tone="info" text={`${store.pendingOperations.length} عملية محلية تنتظر المزامنة.`} />
                <AlertCard tone="success" text={`تم توثيق ${requiredDatabaseTables.length} جدول قاعدة بيانات للمؤسسة.`} />
                {store.conflictMessages.map((message) => (
                  <AlertCard key={message} tone="danger" text={message} />
                ))}
              </div>
            </div>

            <div className="luxury-panel rounded-[2rem] p-5">
              <h3 className="text-xl font-black">سجل التدقيق</h3>
              <div className="mt-4 space-y-2">
                {store.auditEvents.slice(0, 8).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/60">
                    <div className="font-bold text-white">{auditActionCopy[event.action] ?? event.action}</div>
                    <div className="text-xs text-white/45">
                      {event.actor} - {event.target} - {formatDateTime(event.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function SelectVehicle({
  register,
  vehicles
}: {
  register: UseFormRegisterReturn;
  vehicles: Vehicle[];
}) {
  return (
    <Field label="السيارة">
      <select className={inputClass} {...register}>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.internalNumber} - {vehicle.manufacturer} {vehicle.model}
          </option>
        ))}
      </select>
    </Field>
  );
}

function SelectCustomer({
  register,
  customers
}: {
  register: UseFormRegisterReturn;
  customers: Array<{ id: string; name: string }>;
}) {
  return (
    <Field label="العميل">
      <select className={inputClass} {...register}>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function AlertCard({ tone, text }: { tone: "warning" | "info" | "success" | "danger"; text: string }) {
  const classes = {
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    info: "border-sky-400/30 bg-sky-400/10 text-sky-100",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    danger: "border-red-400/30 bg-red-400/10 text-red-100"
  };

  return <p className={cn("rounded-2xl border p-3 text-sm", classes[tone])}>{text}</p>;
}
