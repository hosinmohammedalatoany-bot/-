export type ModuleKey =
  | "dashboard"
  | "cars"
  | "customers"
  | "leads"
  | "sales"
  | "installments"
  | "purchases"
  | "inventory"
  | "accounting"
  | "employees"
  | "branches"
  | "reservations"
  | "test-drives"
  | "maintenance"
  | "insurance"
  | "offers"
  | "whatsapp"
  | "reports"
  | "notifications"
  | "permissions"
  | "printing"
  | "backup-sync"
  | "system-health"
  | "settings";

export type EntityStatus =
  | "available"
  | "reserved"
  | "sold"
  | "maintenance"
  | "not-ready"
  | "new"
  | "contacted"
  | "interested"
  | "converted"
  | "paid"
  | "overdue"
  | "pending";

export type QueueOperation =
  | "vehicle.create"
  | "vehicle.update"
  | "vehicle.delete"
  | "customer.create"
  | "customer.delete"
  | "lead.create"
  | "lead.delete"
  | "reservation.create"
  | "reservation.delete"
  | "invoice.create"
  | "invoice.delete"
  | "expense.create"
  | "expense.delete"
  | "installment.payment"
  | "installment.delete"
  | "file.attach"
  | "print.delete";

export type SyncStatus = "online" | "offline" | "syncing";

export interface Vehicle {
  id: string;
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
  status: Extract<EntityStatus, "available" | "reserved" | "sold" | "maintenance" | "not-ready">;
  branch: string;
  supplier: string;
  photos: number;
  documents: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  idNumber: string;
  balance: number;
  purchases: number;
  notes: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  source: "WhatsApp" | "Facebook" | "Instagram" | "Walk-In" | "Phone Call";
  phone: string;
  assignedTo: string;
  vehicleId?: string;
  status: Extract<EntityStatus, "new" | "contacted" | "interested" | "converted">;
  nextFollowUp: string;
  note: string;
}

export interface Installment {
  id: string;
  customerId: string;
  vehicleId: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: Extract<EntityStatus, "paid" | "overdue" | "pending">;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  branch: string;
  description: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  vehicleId: string;
  customerId: string;
  employee: string;
  deposit: number;
  expiresAt: string;
}

export interface Invoice {
  id: string;
  vehicleId: string;
  customerId: string;
  type: "cash" | "bank-transfer" | "installment" | "mixed";
  total: number;
  discount: number;
  tax: number;
  status: "draft" | "issued" | "revised";
  createdAt: string;
}

export interface PendingOperation {
  id: string;
  operation: QueueOperation;
  entityId: string;
  entityLabel: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface PrintedDocument {
  id: string;
  documentType: string;
  documentNumber: string;
  branch: string;
  printCount: number;
  status: "success" | "failed";
  printedAt: string;
  actor: string;
}

export const modules: Array<{
  key: ModuleKey;
  title: string;
  arabicTitle: string;
  description: string;
  capabilities: string[];
}> = [
  {
    key: "dashboard",
    title: "Dashboard",
    arabicTitle: "لوحة التحكم",
    description: "Executive KPI cards, alerts, charts, and synchronization health.",
    capabilities: ["KPI cards", "Charts", "Alerts", "Best employees", "Sync status"]
  },
  {
    key: "cars",
    title: "Cars Management",
    arabicTitle: "إدارة السيارات",
    description: "Vehicle lifecycle, QR/barcode identities, VIN prevention, media, and profit analysis.",
    capabilities: ["Add/edit/archive", "VIN validation", "QR + barcode", "Media", "Vehicle history"]
  },
  {
    key: "customers",
    title: "Customers",
    arabicTitle: "العملاء",
    description: "Customer profiles, purchase history, statements, documents, and communications.",
    capabilities: ["Profiles", "ID documents", "Statements", "Payments", "Communication history"]
  },
  {
    key: "leads",
    title: "Leads",
    arabicTitle: "العملاء المحتملون",
    description: "Lead sources, follow-ups, assignment, reminders, and conversion tracking.",
    capabilities: ["WhatsApp leads", "Follow-ups", "Assignment", "Conversion", "Reminders"]
  },
  {
    key: "sales",
    title: "Sales",
    arabicTitle: "المبيعات",
    description: "Invoices, contracts, mixed payments, commissions, and accounting entries.",
    capabilities: ["Cash sales", "Installments", "PDF invoice", "Contracts", "Commissions"]
  },
  {
    key: "installments",
    title: "Installments",
    arabicTitle: "الأقساط",
    description: "Contracts, due schedules, receipts, overdue alerts, and WhatsApp reminders.",
    capabilities: ["Payment schedule", "Receipts", "Overdue alerts", "Interest", "Reminders"]
  },
  {
    key: "purchases",
    title: "Purchases",
    arabicTitle: "المشتريات",
    description: "Supplier purchases, cost calculations, documents, and inventory entry.",
    capabilities: ["Supplier records", "Purchase docs", "Costing", "Inventory entry", "Accounting"]
  },
  {
    key: "inventory",
    title: "Inventory",
    arabicTitle: "المخزون",
    description: "Branch inventory, readiness status, transfers, and stock reporting.",
    capabilities: ["Branch stock", "Transfers", "Readiness", "Stock reports", "Counts"]
  },
  {
    key: "accounting",
    title: "Accounting",
    arabicTitle: "المحاسبة",
    description: "Revenue, expenses, cashbox, bank accounts, payroll, and profit/loss.",
    capabilities: ["Cashbox", "Banking", "P&L", "Payroll", "Balances"]
  },
  {
    key: "employees",
    title: "Employees",
    arabicTitle: "الموظفون",
    description: "Roles, salary, commission, branch assignment, and activity logs.",
    capabilities: ["Roles", "Commission", "Performance", "Salary", "Activity logs"]
  },
  {
    key: "branches",
    title: "Branches",
    arabicTitle: "الفروع",
    description: "Multi-branch inventory, staff, sales, transfer, and branch performance.",
    capabilities: ["Inventory", "Sales", "Employees", "Transfers", "Performance"]
  },
  {
    key: "reservations",
    title: "Reservations",
    arabicTitle: "الحجوزات",
    description: "Reservation receipts, deposits, expiry tracking, and customer reminders.",
    capabilities: ["Deposits", "Receipts", "Expiry", "Approvals", "Notifications"]
  },
  {
    key: "test-drives",
    title: "Test Drives",
    arabicTitle: "تجربة القيادة",
    description: "Test drive scheduling, vehicle assignment, customer forms, and liability tracking.",
    capabilities: ["Scheduling", "Customer form", "Employee assignment", "Vehicle return", "Notes"]
  },
  {
    key: "maintenance",
    title: "Maintenance",
    arabicTitle: "الصيانة",
    description: "Repairs, readiness, maintenance costs, vendor records, and document expiry.",
    capabilities: ["Repair logs", "Costs", "Vendors", "Readiness", "History"]
  },
  {
    key: "insurance",
    title: "Insurance",
    arabicTitle: "التأمين",
    description: "Policy records, expiry alerts, customer insurance, and document uploads.",
    capabilities: ["Policies", "Expiry alerts", "Documents", "Providers", "Renewals"]
  },
  {
    key: "offers",
    title: "Offers",
    arabicTitle: "العروض",
    description: "Discount offers, approval workflows, campaign tracking, and lead follow-up.",
    capabilities: ["Discounts", "Approvals", "Campaigns", "Lead capture", "Analytics"]
  },
  {
    key: "whatsapp",
    title: "WhatsApp Integration",
    arabicTitle: "واتساب",
    description: "Share vehicles, invoices, contracts, installment reminders, and templates.",
    capabilities: ["Vehicle share", "PDF sending", "Templates", "Reminders", "History"]
  },
  {
    key: "reports",
    title: "Reports",
    arabicTitle: "التقارير",
    description: "Sales, profit, expense, inventory, customer, lead, installment, employee, and branch reports.",
    capabilities: ["PDF", "Excel", "Daily", "Monthly", "Yearly"]
  },
  {
    key: "notifications",
    title: "Notifications",
    arabicTitle: "الإشعارات",
    description: "Event alerts for sales, reservations, installments, insurance, documents, and sync failures.",
    capabilities: ["Due alerts", "Sync alerts", "Approval alerts", "Expiry alerts", "Read tracking"]
  },
  {
    key: "permissions",
    title: "Users & Permissions",
    arabicTitle: "المستخدمون والصلاحيات",
    description: "JWT-ready role model, granular permissions, approval gates, and audit logs.",
    capabilities: ["RBAC", "Approvals", "Audit logs", "Branch scope", "Permission matrix"]
  },
  {
    key: "printing",
    title: "Printing Center",
    arabicTitle: "مركز الطباعة",
    description: "A4, thermal, PDF, Excel, print previews, templates, RTL documents, and receipts.",
    capabilities: ["A4", "Thermal", "PDF", "Excel", "RTL templates"]
  },
  {
    key: "backup-sync",
    title: "Backup & Sync",
    arabicTitle: "النسخ الاحتياطي والمزامنة",
    description: "Offline queues, conflict logs, file synchronization, backups, and reconciliation.",
    capabilities: ["Offline queue", "Conflict logs", "Backups", "File sync", "Reconciliation"]
  },
  {
    key: "system-health",
    title: "System Health Monitor",
    arabicTitle: "مراقبة النظام",
    description: "Device sessions, PWA installs, cache health, API health, errors, and sync failures.",
    capabilities: ["Device sessions", "PWA installs", "Error logs", "API health", "Cache health"]
  },
  {
    key: "settings",
    title: "Settings",
    arabicTitle: "الإعدادات",
    description: "Company identity, logo, stamp, signature, tax details, and template settings.",
    capabilities: ["Company profile", "Logo upload", "Stamp", "Signature", "Templates"]
  }
];

export const permissionGroups = [
  {
    role: "Super Admin",
    permissions: ["All modules", "Approve high value sales", "Delete vehicles", "Export all reports", "Manage backups"]
  },
  {
    role: "Branch Manager",
    permissions: ["Branch dashboard", "Approve discounts", "Transfer vehicles", "Manage employees", "Print reports"]
  },
  {
    role: "Sales Employee",
    permissions: ["Create leads", "Create reservations", "Create sales", "Share WhatsApp", "View assigned customers"]
  },
  {
    role: "Accountant",
    permissions: ["Accounting", "Expenses", "Installment payments", "Financial reports", "Customer statements"]
  },
  {
    role: "Inventory Employee",
    permissions: ["Add vehicles", "Upload documents", "Condition reports", "Maintenance status", "Inventory reports"]
  },
  {
    role: "Read Only",
    permissions: ["View dashboards", "View vehicles", "View reports", "No exports", "No price edits"]
  }
];

export const requiredDatabaseTables = [
  "users",
  "roles",
  "permissions",
  "branches",
  "employees",
  "customers",
  "cars",
  "car_images",
  "car_documents",
  "sales",
  "sale_items",
  "installments",
  "installment_payments",
  "purchases",
  "suppliers",
  "expenses",
  "revenues",
  "accounts",
  "reservations",
  "test_drives",
  "maintenance_records",
  "insurance_records",
  "notifications",
  "sync_queue",
  "sync_logs",
  "conflict_logs",
  "audit_logs",
  "settings",
  "backups",
  "company_settings",
  "invoice_templates",
  "invoices",
  "invoice_items",
  "printed_documents",
  "payment_receipts",
  "contract_templates",
  "leads",
  "lead_followups",
  "offers",
  "discounts",
  "whatsapp_messages",
  "car_history",
  "car_condition_reports",
  "approval_requests",
  "invoice_revision_logs",
  "daily_dashboard_logs",
  "print_jobs",
  "print_settings",
  "export_logs",
  "device_sessions",
  "pwa_installations",
  "offline_cache_logs",
  "button_action_logs",
  "error_logs"
];

const now = new Date().toISOString();

export const seedVehicles: Vehicle[] = [
  {
    id: "veh-001",
    internalNumber: "BR-2026-001",
    vin: "WBA5R7C00LFH12345",
    plateNumber: "BAG-101",
    manufacturer: "BMW",
    model: "530i",
    trim: "M Sport",
    year: 2024,
    exteriorColor: "Black Sapphire",
    interiorColor: "Cognac",
    fuelType: "Petrol",
    transmission: "Automatic",
    mileage: 8200,
    purchasePrice: 41500,
    salePrice: 48900,
    minimumSalePrice: 46500,
    maintenanceCost: 850,
    transportationCost: 300,
    status: "available",
    branch: "Main Showroom",
    supplier: "Premium Imports LLC",
    photos: 14,
    documents: 6,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "veh-002",
    internalNumber: "BR-2026-002",
    vin: "JTDB4MEE7P3012345",
    plateNumber: "BAG-202",
    manufacturer: "Toyota",
    model: "Corolla",
    trim: "Hybrid Limited",
    year: 2023,
    exteriorColor: "Pearl White",
    interiorColor: "Black",
    fuelType: "Hybrid",
    transmission: "CVT",
    mileage: 12600,
    purchasePrice: 19800,
    salePrice: 23600,
    minimumSalePrice: 22500,
    maintenanceCost: 320,
    transportationCost: 180,
    status: "reserved",
    branch: "Airport Branch",
    supplier: "Al Najm Auctions",
    photos: 10,
    documents: 4,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "veh-003",
    internalNumber: "BR-2026-003",
    vin: "WA1AAAF78MD012345",
    plateNumber: "BAG-303",
    manufacturer: "Audi",
    model: "Q7",
    trim: "Premium Plus",
    year: 2022,
    exteriorColor: "Metallic Gray",
    interiorColor: "Black",
    fuelType: "Petrol",
    transmission: "Automatic",
    mileage: 34200,
    purchasePrice: 47200,
    salePrice: 54800,
    minimumSalePrice: 52000,
    maintenanceCost: 1850,
    transportationCost: 450,
    status: "maintenance",
    branch: "Main Showroom",
    supplier: "Direct Customer Purchase",
    photos: 18,
    documents: 9,
    createdAt: now,
    updatedAt: now
  }
];

export const seedCustomers: Customer[] = [
  {
    id: "cus-001",
    name: "Omar Al-Karim",
    phone: "+964 770 111 2200",
    email: "omar@example.com",
    address: "Baghdad, Al Mansour",
    idNumber: "ID-889120",
    balance: 0,
    purchases: 2,
    notes: "Prefers premium German sedans.",
    createdAt: now
  },
  {
    id: "cus-002",
    name: "Layla Hassan",
    phone: "+964 750 555 0101",
    email: "layla@example.com",
    address: "Baghdad, Karrada",
    idNumber: "ID-552019",
    balance: 7800,
    purchases: 1,
    notes: "Installment customer with excellent payment history.",
    createdAt: now
  }
];

export const seedLeads: Lead[] = [
  {
    id: "lead-001",
    name: "Mustafa Saleh",
    source: "WhatsApp",
    phone: "+964 771 333 4411",
    assignedTo: "Sara N.",
    vehicleId: "veh-001",
    status: "interested",
    nextFollowUp: new Date(Date.now() + 86400000).toISOString(),
    note: "Requested video walkaround and installment options."
  },
  {
    id: "lead-002",
    name: "Nadia Abbas",
    source: "Instagram",
    phone: "+964 780 222 7788",
    assignedTo: "Ali R.",
    vehicleId: "veh-002",
    status: "contacted",
    nextFollowUp: new Date(Date.now() + 172800000).toISOString(),
    note: "Interested in hybrid vehicles under 25k."
  }
];

export const seedInstallments: Installment[] = [
  {
    id: "ins-001",
    customerId: "cus-002",
    vehicleId: "veh-002",
    dueDate: new Date().toISOString(),
    amount: 950,
    paidAmount: 0,
    status: "pending"
  },
  {
    id: "ins-002",
    customerId: "cus-002",
    vehicleId: "veh-002",
    dueDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    amount: 950,
    paidAmount: 0,
    status: "overdue"
  }
];

export const seedExpenses: Expense[] = [
  {
    id: "exp-001",
    category: "Vehicle transport",
    amount: 300,
    branch: "Main Showroom",
    description: "BMW 530i auction transfer",
    createdAt: now
  },
  {
    id: "exp-002",
    category: "Maintenance",
    amount: 1850,
    branch: "Main Showroom",
    description: "Audi Q7 brake and paint correction",
    createdAt: now
  }
];

export const seedReservations: Reservation[] = [
  {
    id: "res-001",
    vehicleId: "veh-002",
    customerId: "cus-001",
    employee: "Sara N.",
    deposit: 1000,
    expiresAt: new Date(Date.now() + 86400000 * 2).toISOString()
  }
];

export const seedInvoices: Invoice[] = [
  {
    id: "inv-001",
    vehicleId: "veh-002",
    customerId: "cus-001",
    type: "mixed",
    total: 23600,
    discount: 400,
    tax: 0,
    status: "issued",
    createdAt: now
  }
];

export const seedAuditEvents: AuditEvent[] = [
  {
    id: "aud-001",
    actor: "Super Admin",
    action: "Vehicle reserved",
    target: "BR-2026-002",
    createdAt: now
  },
  {
    id: "aud-002",
    actor: "Accountant",
    action: "Expense recorded",
    target: "Audi Q7 maintenance",
    createdAt: now
  }
];
