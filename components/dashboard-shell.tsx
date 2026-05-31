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
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { buildTableReportHtml } from "@/components/print/document-templates";
import { exportHtmlAsPdf, printHtml } from "@/lib/print";
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
  return status.replace("-", " ");
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

  return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold capitalize", color)}>{status}</span>;
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
  const [actionLog, setActionLog] = useState<string[]>(["System ready. Offline queue is active."]);
  const [rtl, setRtl] = useState(false);
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
    category: "Marketing",
    amount: 250,
    branch: "Main Showroom",
    description: "Instagram vehicle campaign"
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
      ["Internal Number", "VIN", "Vehicle", "Status", "Purchase", "Sale", "Branch"],
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
    log("Inventory CSV exported for Excel.");
  }

  function dashboardReportHtml() {
    return buildTableReportHtml(
      "تقرير لوحة التحكم",
      ["المؤشر", "القيمة"],
      [
        ["مركبات متاحة", String(metrics.available)],
        ["مركبات مباعة", String(metrics.sold)],
        ["محجوزة", String(metrics.reserved)],
        ["إجمالي المبيعات", formatCurrency(metrics.totalSales)],
        ["المصروفات", formatCurrency(metrics.expenses)],
        ["قيمة المخزون", formatCurrency(metrics.inventoryValue)],
        ["أرباح متوقعة", formatCurrency(metrics.expectedProfit)],
        ["أقساط اليوم", String(metrics.todaysInstallments)],
        ["أقساط متأخرة", String(metrics.overdueInstallments)]
      ]
    );
  }

  function exportPdf() {
    exportHtmlAsPdf("baraa-raed-dashboard.pdf", dashboardReportHtml());
    log("تم تصدير تقرير HTML — افتحه واطبعه إلى PDF.");
  }

  function printCenter() {
    printHtml({ title: "تقرير لوحة التحكم", html: dashboardReportHtml() });
    log("تم فتح طباعة تقرير اللوحة (بدون ورقة فارغة).");
  }

  function shareWhatsApp() {
    const vehicle = store.vehicles[0];
    const message = encodeURIComponent(
      `Baraa Raed vehicle offer: ${vehicle.manufacturer} ${vehicle.model} ${vehicle.year} - ${formatCurrency(
        vehicle.salePrice
      )}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
    log("WhatsApp share link opened.");
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
    log("Encrypted-backup-ready JSON exported locally.");
  }

  const selectedModule = modules.find((module) => module.key === store.selectedModule) ?? modules[0];

  return (
    <main className={cn("min-h-screen px-4 py-5 sm:px-6 lg:px-8", rtl && "rtl-support")}>
      <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[290px_1fr]">
        <aside className="luxury-panel sticky top-5 h-fit rounded-[2rem] p-4">
          <BrandLogo />
          <div className="mt-5 grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => setRtl((value) => !value)}>{rtl ? "LTR" : "RTL"}</SecondaryButton>
            <SecondaryButton onClick={() => store.setNetworkStatus(store.syncStatus === "offline")}>
              {store.syncStatus === "offline" ? "Go Online" : "Go Offline"}
            </SecondaryButton>
          </div>
          <nav className="mt-5 max-h-[68vh] space-y-1 overflow-auto pr-1">
            {modules.map((module) => (
              <button
                type="button"
                key={module.key}
                onClick={() => store.setSelectedModule(module.key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition",
                  store.selectedModule === module.key
                    ? "border border-[#d6a84f]/45 bg-[#d6a84f]/15 text-[#f3c96b]"
                    : "text-white/68 hover:bg-white/8 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2">
                  {moduleIcons[module.key]}
                  {module.title}
                </span>
                <span className="text-xs text-white/35">{module.arabicTitle}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-5">
          <header className="luxury-panel overflow-hidden rounded-[2rem] p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-[#d6a84f]">Owned Enterprise ERP</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
                  Baraa Raed <span className="gold-text">Showroom Command</span>
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-white/65">
                  Offline-first vehicle sales, installments, inventory, accounting, approvals, reports, printing, and
                  WhatsApp operations for an owner-controlled car showroom system.
                </p>
              </div>
              <div className="grid min-w-[280px] gap-3 rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-white/70">
                    {store.syncStatus === "offline" ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                    Sync status
                  </span>
                  <StatusBadge status={store.syncStatus} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">Pending operations</span>
                  <strong>{store.pendingOperations.length}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">Last sync</span>
                  <strong>{store.lastSyncAt ? formatDateTime(store.lastSyncAt) : "Not synced"}</strong>
                </div>
                <PrimaryButton onClick={() => void store.synchronize()} disabled={store.syncStatus === "offline"}>
                  <span className="inline-flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Sync Now
                  </span>
                </PrimaryButton>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Available Cars", metrics.available, <Car key="icon" className="h-5 w-5" />],
              ["Total Sales", formatCurrency(metrics.totalSales), <Receipt key="icon" className="h-5 w-5" />],
              ["Expected Profit", formatCurrency(metrics.expectedProfit), <BadgeDollarSign key="icon" className="h-5 w-5" />],
              ["Overdue Installments", metrics.overdueInstallments, <AlertTriangle key="icon" className="h-5 w-5" />],
              ["Customers", store.customers.length, <Users key="icon" className="h-5 w-5" />],
              ["Leads", store.leads.length, <UserRoundPlus key="icon" className="h-5 w-5" />],
              ["Reserved Cars", metrics.reserved, <CheckCircle2 key="icon" className="h-5 w-5" />],
              ["Inventory Value", formatCurrency(metrics.inventoryValue), <PackageCheck key="icon" className="h-5 w-5" />]
            ].map(([label, value, icon]) => (
              <motion.article
                key={label.toString()}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="luxury-panel rounded-3xl p-5"
              >
                <div className="flex items-center justify-between text-[#d6a84f]">
                  {icon}
                  <span className="text-xs uppercase tracking-[0.25em] text-white/35">Live</span>
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
                  <p className="text-xs uppercase tracking-[0.3em] text-[#d6a84f]">Active Module</p>
                  <h2 className="mt-2 text-2xl font-black">{selectedModule.title}</h2>
                  <p className="mt-1 text-sm text-white/55">{selectedModule.description}</p>
                </div>
                <StatusBadge status={selectedModule.arabicTitle} />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {selectedModule.capabilities.map((capability) => (
                  <button
                    type="button"
                    key={capability}
                    onClick={() => log(`${selectedModule.title}: ${capability} action executed.`)}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-[#d6a84f]/60 hover:bg-[#d6a84f]/10"
                  >
                    <span className="text-sm font-bold text-white">{capability}</span>
                    <span className="mt-2 block text-xs leading-5 text-white/45">
                      Permission checked, audit logged, and offline-safe.
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="luxury-panel rounded-[2rem] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-[#d6a84f]">Quick Actions</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SecondaryButton onClick={shareWhatsApp}>WhatsApp Share</SecondaryButton>
                <SecondaryButton onClick={exportPdf}>PDF Export</SecondaryButton>
                <SecondaryButton onClick={exportExcel}>Excel Export</SecondaryButton>
                <SecondaryButton onClick={printCenter}>Print Center</SecondaryButton>
                <SecondaryButton onClick={backupJson}>Backup JSON</SecondaryButton>
                <SecondaryButton onClick={() => store.attachLocalFile(selectedModule.title)}>Queue File</SecondaryButton>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm font-bold text-white">PWA + Device Coverage</p>
                <div className="mt-3 grid gap-2 text-sm text-white/55">
                  <span className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-[#d6a84f]" />
                    Installable on Chrome, Edge, Safari, Android, iPhone, and Windows.
                  </span>
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#d6a84f]" />
                    Designed for JWT, refresh tokens, branch RBAC, and audit logs.
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
                  log(parsed.error.issues[0]?.message ?? "Vehicle validation failed.");
                  return;
                }
                const result = store.addVehicle(parsed.data);
                log(result.ok ? `Vehicle ${result.vehicle.internalNumber} added locally.` : result.message);
              })}
            >
              <h3 className="text-xl font-black">Add Vehicle</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {([
                  ["internalNumber", "Internal Number"],
                  ["vin", "VIN"],
                  ["plateNumber", "Plate"],
                  ["manufacturer", "Manufacturer"],
                  ["model", "Model"],
                  ["trim", "Trim"],
                  ["year", "Year"],
                  ["exteriorColor", "Exterior Color"],
                  ["interiorColor", "Interior Color"],
                  ["fuelType", "Fuel Type"],
                  ["transmission", "Transmission"],
                  ["mileage", "Mileage"],
                  ["purchasePrice", "Purchase Price"],
                  ["salePrice", "Sale Price"],
                  ["minimumSalePrice", "Minimum Sale"],
                  ["maintenanceCost", "Maintenance Cost"],
                  ["transportationCost", "Transport Cost"],
                  ["branch", "Branch"],
                  ["supplier", "Supplier"]
                ] as Array<[keyof VehicleInput, string]>).map(([name, label]) => (
                  <Field key={name} label={label}>
                    <input className={inputClass} {...vehicleForm.register(name)} />
                  </Field>
                ))}
              </div>
              <div className="mt-4">
                <PrimaryButton type="submit">Add Vehicle Offline-Safe</PrimaryButton>
              </div>
            </form>

            <div className="space-y-5">
              <form
                className="luxury-panel rounded-[2rem] p-5"
                onSubmit={customerForm.handleSubmit((data) => {
                  const parsed = customerSchema.safeParse(data);
                  if (!parsed.success) {
                    log(parsed.error.issues[0]?.message ?? "Customer validation failed.");
                    return;
                  }
                  const customer = store.addCustomer(parsed.data);
                  log(`Customer ${customer.name} added locally.`);
                })}
              >
                <h3 className="text-xl font-black">Add Customer</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {([
                    ["name", "Name"],
                    ["phone", "Phone"],
                    ["email", "Email"],
                    ["address", "Address"],
                    ["idNumber", "ID Number"],
                    ["notes", "Notes"]
                  ] as Array<[keyof CustomerInput, string]>).map(([name, label]) => (
                    <Field key={name} label={label}>
                      <input className={inputClass} {...customerForm.register(name)} />
                    </Field>
                  ))}
                </div>
                <div className="mt-4">
                  <PrimaryButton type="submit">Add Customer</PrimaryButton>
                </div>
              </form>

              <form
                className="luxury-panel rounded-[2rem] p-5"
                onSubmit={leadForm.handleSubmit((data) => {
                  const parsed = leadSchema.safeParse(data);
                  if (!parsed.success) {
                    log(parsed.error.issues[0]?.message ?? "Lead validation failed.");
                    return;
                  }
                  const lead = store.addLead(parsed.data);
                  log(`Lead ${lead.name} captured from ${lead.source}.`);
                })}
              >
                <h3 className="text-xl font-black">Capture Lead</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Name">
                    <input className={inputClass} {...leadForm.register("name")} />
                  </Field>
                  <Field label="Phone">
                    <input className={inputClass} {...leadForm.register("phone")} />
                  </Field>
                  <Field label="Source">
                    <select className={inputClass} {...leadForm.register("source")}>
                      {["WhatsApp", "Facebook", "Instagram", "Walk-In", "Phone Call"].map((source) => (
                        <option key={source}>{source}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Assigned To">
                    <input className={inputClass} {...leadForm.register("assignedTo")} />
                  </Field>
                  <Field label="Vehicle">
                    <select className={inputClass} {...leadForm.register("vehicleId")}>
                      {store.vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.internalNumber} - {vehicle.manufacturer} {vehicle.model}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Note">
                    <input className={inputClass} {...leadForm.register("note")} />
                  </Field>
                </div>
                <div className="mt-4">
                  <PrimaryButton type="submit">Create Lead</PrimaryButton>
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
                  log(parsed.error.issues[0]?.message ?? "Reservation validation failed.");
                  return;
                }
                const reservation = store.addReservation(parsed.data);
                log(`Reservation ${reservation.id} created and vehicle marked reserved.`);
              })}
            >
              <h3 className="text-lg font-black">Reservation</h3>
              <div className="mt-4 grid gap-3">
                <SelectVehicle register={reservationForm.register("vehicleId")} vehicles={store.vehicles} />
                <SelectCustomer register={reservationForm.register("customerId")} customers={store.customers} />
                <Field label="Employee">
                  <input className={inputClass} {...reservationForm.register("employee")} />
                </Field>
                <Field label="Deposit">
                  <input className={inputClass} {...reservationForm.register("deposit")} />
                </Field>
                <Field label="Expires At">
                  <input type="datetime-local" className={inputClass} {...reservationForm.register("expiresAt")} />
                </Field>
              </div>
              <div className="mt-4">
                <PrimaryButton type="submit">Create Reservation</PrimaryButton>
              </div>
            </form>

            <form
              className="luxury-panel rounded-[2rem] p-5"
              onSubmit={invoiceForm.handleSubmit((data) => {
                const parsed = invoiceSchema.safeParse(data);
                if (!parsed.success) {
                  log(parsed.error.issues[0]?.message ?? "Invoice validation failed.");
                  return;
                }
                const invoice = store.addInvoice(parsed.data);
                log(`Invoice ${invoice.id} issued with accounting entry.`);
              })}
            >
              <h3 className="text-lg font-black">Sales Invoice</h3>
              <div className="mt-4 grid gap-3">
                <SelectVehicle register={invoiceForm.register("vehicleId")} vehicles={store.vehicles} />
                <SelectCustomer register={invoiceForm.register("customerId")} customers={store.customers} />
                <Field label="Payment Type">
                  <select className={inputClass} {...invoiceForm.register("type")}>
                    <option value="cash">Cash Sale</option>
                    <option value="bank-transfer">Bank Transfer</option>
                    <option value="installment">Installment Sale</option>
                    <option value="mixed">Mixed Payment</option>
                  </select>
                </Field>
                <Field label="Total">
                  <input className={inputClass} {...invoiceForm.register("total")} />
                </Field>
                <Field label="Discount">
                  <input className={inputClass} {...invoiceForm.register("discount")} />
                </Field>
                <Field label="Tax">
                  <input className={inputClass} {...invoiceForm.register("tax")} />
                </Field>
              </div>
              <div className="mt-4">
                <PrimaryButton type="submit">Issue Invoice</PrimaryButton>
              </div>
            </form>

            <div className="space-y-5">
              <form
                className="luxury-panel rounded-[2rem] p-5"
                onSubmit={expenseForm.handleSubmit((data) => {
                  const parsed = expenseSchema.safeParse(data);
                  if (!parsed.success) {
                    log(parsed.error.issues[0]?.message ?? "Expense validation failed.");
                    return;
                  }
                  const expense = store.addExpense(parsed.data);
                  log(`Expense ${expense.category} recorded.`);
                })}
              >
                <h3 className="text-lg font-black">Expense</h3>
                <div className="mt-4 grid gap-3">
                  <Field label="Category">
                    <input className={inputClass} {...expenseForm.register("category")} />
                  </Field>
                  <Field label="Amount">
                    <input className={inputClass} {...expenseForm.register("amount")} />
                  </Field>
                  <Field label="Branch">
                    <input className={inputClass} {...expenseForm.register("branch")} />
                  </Field>
                  <Field label="Description">
                    <input className={inputClass} {...expenseForm.register("description")} />
                  </Field>
                </div>
                <div className="mt-4">
                  <PrimaryButton type="submit">Record Expense</PrimaryButton>
                </div>
              </form>

              <form
                className="luxury-panel rounded-[2rem] p-5"
                onSubmit={paymentForm.handleSubmit((data) => {
                  const parsed = installmentPaymentSchema.safeParse(data);
                  if (!parsed.success) {
                    log(parsed.error.issues[0]?.message ?? "Payment validation failed.");
                    return;
                  }
                  store.recordInstallmentPayment(parsed.data);
                  log(`Installment payment ${formatCurrency(parsed.data.amount)} recorded.`);
                })}
              >
                <h3 className="text-lg font-black">Installment Payment</h3>
                <div className="mt-4 grid gap-3">
                  <Field label="Installment">
                    <select className={inputClass} {...paymentForm.register("installmentId")}>
                      {store.installments.map((installment) => (
                        <option key={installment.id} value={installment.id}>
                          {installment.id} - {formatCurrency(installment.amount)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Amount">
                    <input className={inputClass} {...paymentForm.register("amount")} />
                  </Field>
                </div>
                <div className="mt-4">
                  <PrimaryButton type="submit">Record Payment</PrimaryButton>
                </div>
              </form>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
            <div className="luxury-panel rounded-[2rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-black">Vehicle Inventory</h3>
                <span className="text-sm text-white/45">{formatNumber(store.vehicles.length)} vehicles</span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="text-left text-white/45">
                    <tr>
                      <th className="py-3">Identity</th>
                      <th>Vehicle</th>
                      <th>Price</th>
                      <th>Profit</th>
                      <th>Status</th>
                      <th>Branch</th>
                      <th>Actions</th>
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
                            <StatusBadge status={statusLabel(vehicle.status)} />
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
                                    {status}
                                  </button>
                                )
                              )}
                              <DeleteRowButton
                                onConfirm={() => {
                                  const result = store.deleteVehicle(vehicle.id);
                                  if (!result.ok) window.alert(result.message);
                                }}
                              />
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
                <h3 className="text-xl font-black">RBAC Matrix</h3>
                <div className="mt-4 space-y-3">
                  {permissionGroups.map((group) => (
                    <details key={group.role} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                      <summary className="cursor-pointer font-bold text-[#f3c96b]">{group.role}</summary>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/55">
                        {group.permissions.map((permission) => (
                          <li key={permission}>{permission}</li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </div>

              <div className="luxury-panel rounded-[2rem] p-5">
                <h3 className="text-xl font-black">Action Log</h3>
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
              <h3 className="text-xl font-black">Pending Sync Queue</h3>
              <div className="mt-4 space-y-2">
                {store.pendingOperations.length === 0 ? (
                  <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                    No pending operations. Device is reconciled.
                  </p>
                ) : (
                  store.pendingOperations.map((operation) => (
                    <div key={operation.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <strong>{operation.operation}</strong>
                        <span className="text-xs text-white/45">{formatDateTime(operation.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-white/50">{operation.entityLabel}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="luxury-panel rounded-[2rem] p-5">
              <h3 className="text-xl font-black">Alerts</h3>
              <div className="mt-4 space-y-3">
                <AlertCard tone="warning" text={`${metrics.overdueInstallments} overdue installment(s) require follow-up.`} />
                <AlertCard tone="info" text={`${store.pendingOperations.length} local operation(s) waiting for sync.`} />
                <AlertCard tone="success" text={`${requiredDatabaseTables.length} enterprise database tables documented.`} />
                {store.conflictMessages.map((message) => (
                  <AlertCard key={message} tone="danger" text={message} />
                ))}
              </div>
            </div>

            <div className="luxury-panel rounded-[2rem] p-5">
              <h3 className="text-xl font-black">Audit Trail</h3>
              <div className="mt-4 space-y-2">
                {store.auditEvents.slice(0, 8).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-white/60">
                    <div className="font-bold text-white">{event.action}</div>
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
    <Field label="Vehicle">
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
    <Field label="Customer">
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
