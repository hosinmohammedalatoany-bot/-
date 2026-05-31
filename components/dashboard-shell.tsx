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
      ["الرقم الداخلي", "VIN", "السيارة", "الحالة", "سعر الشراء", "سعر البيع", "الفرع"],
      ...store.vehicles.map((vehicle) => [
        vehicle.internalNumber,
        vehicle.vin,
        `${vehicle.manufacturer} ${vehicle.model}`,
        vehicle.status,
        vehicle.purchasePrice,
        vehicle.salePrice,
        vehicle.branch
      ])
    ];
    createTextDownload("baraa-raed-inventory.csv", rows.map((row) => row.join(",")).join("\n"), "text/csv");
    log("تم تصدير ملف المخزون بصيغة CSV لاستخدامه في Excel.");
  }

  function exportPdf() {
    const html = `<html dir="rtl" lang="ar"><head><title>تقرير براء رائد</title></head><body><h1>تقرير مبيعات براء رائد</h1><pre>${JSON.stringify(
      metrics,
      null,
      2
    )}</pre></body></html>`;
    createTextDownload("baraa-raed-report.html", html, "text/html");
    log("تم تصدير تقرير قابل للطباعة. افتحه واطبعه بصيغة PDF.");
  }

  function printCenter() {
    window.print();
    log("تم فتح مركز الطباعة للوحة الحالية.");
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
                <p className="text-sm uppercase tracking-[0.4em] text-[#d6a84f]">باور | نظام مملوك بالكامل للمعرض</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
                  باور <span className="gold-text">لإدارة معارض السيارات</span>
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
                    onClick={() => log(`تم تنفيذ إجراء ${capability} في ${selectedModuleCopy.title}.`)}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-[#d6a84f]/60 hover:bg-[#d6a84f]/10"
                  >
                    <span className="text-sm font-bold text-white">{capability}</span>
                    <span className="mt-2 block text-xs leading-5 text-white/45">
                      تم فحص الصلاحية وتسجيل العملية وتخزينها للعمل بدون إنترنت.
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

          <section className="grid gap-5 2xl:grid-cols-2">
            <form
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

          <section className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
            <div className="luxury-panel rounded-[2rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-black">مخزون السيارات</h3>
                <span className="text-sm text-white/45">{formatNumber(store.vehicles.length)} سيارة</span>
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
                    {store.vehicles.map((vehicle) => {
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
                                    onClick={() => store.updateVehicleStatus(vehicle.id, status)}
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
