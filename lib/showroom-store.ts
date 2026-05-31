"use client";

import { create } from "zustand";
import {
  type AuditEvent,
  type Customer,
  type Expense,
  type Installment,
  type Invoice,
  type Lead,
  type PendingOperation,
  type QueueOperation,
  type Reservation,
  type SyncStatus,
  type Vehicle,
  seedAuditEvents,
  seedCustomers,
  seedExpenses,
  seedInstallments,
  seedInvoices,
  seedLeads,
  seedReservations,
  seedVehicles
} from "@/lib/domain";
import {
  type ApprovalRequest,
  type BackupRecord,
  type Branch,
  type CommissionRecord,
  type CompanyProfile,
  type CrmActivity,
  type DeviceSession,
  type EntityTag,
  type ErrorLogEntry,
  type InvoiceRevision,
  type LeadPipelineStatus,
  type PeriodLock,
  type PrintJobRecord,
  type SavedFilter,
  type SetupState,
  type SystemNotification,
  type VehicleConditionReport,
  type VehicleTimelineEvent,
  DEFAULT_COMPANY,
  createId,
  verificationCode,
  averageScore
} from "@/lib/enterprise";
import { createAuditEntry } from "@/lib/services/audit";
import { buildSystemNotifications } from "@/lib/services/notifications-engine";
import {
  checkDuplicateCustomerPhone,
  checkDuplicateVin,
  checkVehicleAlreadySold
} from "@/lib/services/duplicates";
import { canEditPrintedInvoice, requiresLargeDiscountApproval } from "@/lib/services/financial";
import { globalSearch } from "@/lib/services/search";
import {
  type CustomerInput,
  type ExpenseInput,
  type InstallmentPaymentInput,
  type InvoiceInput,
  type LeadInput,
  type ReservationInput,
  type VehicleInput
} from "@/lib/validation";

const DB_NAME = "baraa-raed-offline-db";
const DB_VERSION = 2;
const STORE_NAME = "state";
const STATE_KEY = "dashboard";

interface PersistedState {
  vehicles: Vehicle[];
  customers: Customer[];
  leads: Lead[];
  installments: Installment[];
  expenses: Expense[];
  reservations: Reservation[];
  invoices: Invoice[];
  pendingOperations: PendingOperation[];
  auditEvents: AuditEvent[];
  auditLogs: ReturnType<typeof createAuditEntry>[];
  lastSyncAt?: string;
  setup: SetupState;
  company: CompanyProfile;
  branches: Branch[];
  approvals: ApprovalRequest[];
  notifications: SystemNotification[];
  tags: EntityTag[];
  timelines: VehicleTimelineEvent[];
  conditionReports: VehicleConditionReport[];
  crmActivities: CrmActivity[];
  commissions: CommissionRecord[];
  printJobs: PrintJobRecord[];
  backups: BackupRecord[];
  errorLogs: ErrorLogEntry[];
  savedFilters: SavedFilter[];
  periodLocks: PeriodLock[];
  invoiceRevisions: InvoiceRevision[];
  devices: DeviceSession[];
  suppliers: Array<{ id: string; name: string; phone: string }>;
  demoMode: boolean;
  session: { userId: string; userName: string; role: string; branch: string; authenticated: boolean };
  printedInvoices: Record<string, string>;
}

interface ShowroomState extends PersistedState {
  syncStatus: SyncStatus;
  selectedModule: string;
  isHydrated: boolean;
  conflictMessages: string[];
  searchQuery: string;
  toasts: Array<{ id: string; message: string; tone: "success" | "error" | "info" }>;
  setSelectedModule: (module: string) => void;
  setSearchQuery: (query: string) => void;
  pushToast: (message: string, tone?: "success" | "error" | "info") => void;
  dismissToast: (id: string) => void;
  hydrate: () => Promise<void>;
  completeSetup: (payload: Partial<SetupState & CompanyProfile>) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addVehicle: (input: VehicleInput) => { ok: true; vehicle: Vehicle } | { ok: false; message: string };
  archiveVehicle: (vehicleId: string, reason: string) => void;
  updateVehicleStatus: (vehicleId: string, status: Vehicle["status"]) => void;
  addCustomer: (input: CustomerInput) => Customer | { ok: false; message: string };
  addLead: (input: LeadInput) => Lead;
  updateLeadStatus: (leadId: string, status: LeadPipelineStatus) => void;
  addReservation: (input: ReservationInput) => Reservation | { ok: false; message: string };
  addInvoice: (input: InvoiceInput) => Invoice | { ok: false; message: string };
  reviseInvoice: (invoiceId: string, payload: InvoiceInput, reason: string) => { ok: boolean; message: string };
  addExpense: (input: ExpenseInput) => Expense;
  recordInstallmentPayment: (input: InstallmentPaymentInput) => void;
  attachLocalFile: (entityLabel: string) => void;
  requestApproval: (approval: Omit<ApprovalRequest, "id" | "status" | "createdAt">) => void;
  resolveApproval: (approvalId: string, approved: boolean) => void;
  addTag: (entityType: EntityTag["entityType"], entityId: string, label: string, color: string) => void;
  addCrmActivity: (activity: Omit<CrmActivity, "id" | "createdAt">) => void;
  addConditionReport: (vehicleId: string, report: Omit<VehicleConditionReport, "id" | "vehicleId" | "finalScore" | "createdAt">) => void;
  recordPrint: (documentType: string, entityLabel: string, template: PrintJobRecord["template"]) => string;
  runBackup: (manual?: boolean) => void;
  lockPeriod: (kind: PeriodLock["kind"], branch: string) => void;
  markNotificationRead: (id: string) => void;
  refreshNotifications: () => void;
  globalSearchResults: () => ReturnType<typeof globalSearch>;
  transferVehicleBranch: (vehicleId: string, branch: string) => void;
  registerDevice: (device: Omit<DeviceSession, "id" | "lastSeenAt">) => void;
  logError: (message: string, page: string, stack?: string) => void;
  setDemoMode: (enabled: boolean) => void;
  setNetworkStatus: (online: boolean) => void;
  synchronize: () => Promise<void>;
}

const defaultSetup: SetupState = {
  completed: false,
  currentStep: 0,
  adminEmail: "",
  adminName: "",
  printPaper: "a4",
  backupEnabled: true
};

const defaultSession = {
  userId: "usr-admin",
  userName: "Super Admin",
  role: "Super Admin",
  branch: "Main Showroom",
  authenticated: false
};

const baseState: PersistedState = {
  vehicles: seedVehicles,
  customers: seedCustomers,
  leads: seedLeads,
  installments: seedInstallments,
  expenses: seedExpenses,
  reservations: seedReservations,
  invoices: seedInvoices,
  pendingOperations: [],
  auditEvents: seedAuditEvents,
  auditLogs: [],
  lastSyncAt: undefined,
  setup: defaultSetup,
  company: DEFAULT_COMPANY,
  branches: [
    { id: "br-main", name: "Main Showroom", code: "MAIN", address: "Baghdad", phone: "+964", managerName: "Manager" },
    { id: "br-air", name: "Airport Branch", code: "AIR", address: "Airport Road", phone: "+964", managerName: "Branch Lead" }
  ],
  approvals: [],
  notifications: [],
  tags: [],
  timelines: [],
  conditionReports: [],
  crmActivities: [],
  commissions: [],
  printJobs: [],
  backups: [],
  errorLogs: [],
  savedFilters: [],
  periodLocks: [],
  invoiceRevisions: [],
  devices: [],
  suppliers: [
    { id: "sup-1", name: "Premium Imports LLC", phone: "+964" },
    { id: "sup-2", name: "Gulf Luxury Motors", phone: "+964" }
  ],
  demoMode: false,
  session: defaultSession,
  printedInvoices: {}
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readPersistedState(): Promise<PersistedState | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(STATE_KEY);
    request.onsuccess = () => resolve(request.result as PersistedState | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function persistState(state: PersistedState) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(state, STATE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function snapshot(state: ShowroomState): PersistedState {
  const {
    syncStatus: _s,
    selectedModule: _m,
    isHydrated: _h,
    conflictMessages: _c,
    searchQuery: _q,
    toasts: _t,
    ...rest
  } = state;
  return rest;
}

function queue(operation: QueueOperation, entityLabel: string, entityId: string, payload: unknown): PendingOperation {
  return {
    id: createId("op"),
    operation,
    entityId,
    entityLabel,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0
  };
}

function legacyAudit(action: string, target: string): AuditEvent {
  return { id: createId("aud"), actor: "Current User", action, target, createdAt: new Date().toISOString() };
}

function appendTimeline(
  timelines: VehicleTimelineEvent[],
  vehicleId: string,
  type: VehicleTimelineEvent["type"],
  title: string,
  description: string
) {
  return [
    {
      id: createId("tl"),
      vehicleId,
      type,
      title,
      description,
      createdAt: new Date().toISOString()
    },
    ...timelines
  ];
}

export const useShowroomStore = create<ShowroomState>((set, get) => ({
  ...baseState,
  syncStatus: "online",
  selectedModule: "dashboard",
  isHydrated: false,
  conflictMessages: [],
  searchQuery: "",
  toasts: [],
  setSelectedModule: (module) => set({ selectedModule: module }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  pushToast: (message, tone = "info") =>
    set((state) => ({
      toasts: [{ id: createId("toast"), message, tone }, ...state.toasts].slice(0, 5)
    })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  hydrate: async () => {
    const persisted = await readPersistedState();
    const syncStatus: SyncStatus = navigator.onLine ? "online" : "offline";
    const merged = persisted ?? baseState;
    const session = {
      ...defaultSession,
      ...merged.session,
      authenticated:
        merged.session?.authenticated ??
        (merged.setup?.completed ? true : false)
    };
    set({ ...merged, session, isHydrated: true, syncStatus });
    get().refreshNotifications();
  },
  completeSetup: (payload) => {
    set((state) => ({
      setup: { ...state.setup, ...payload, completed: true, currentStep: 8 },
      company: { ...state.company, ...payload },
      session: {
        ...state.session,
        userName: payload.adminName ?? state.session.userName,
        role: "Super Admin",
        branch: payload.mainBranch ?? state.company.mainBranch,
        authenticated: true
      },
      auditLogs: [
        createAuditEntry("create", "setup", "setup", "Initial setup", {
          userName: state.session.userName,
          branch: state.company.mainBranch
        }),
        ...state.auditLogs
      ]
    }));
    void persistState(snapshot(get()));
    get().pushToast("اكتمل إعداد النظام بنجاح.", "success");
  },
  login: (email, password) => {
    const ok = email.length > 3 && password.length >= 4;
    if (!ok) return false;
    set((state) => ({
      session: {
        ...state.session,
        userName: email.split("@")[0] ?? "User",
        authenticated: true
      },
      auditLogs: [
        createAuditEntry("login", "session", state.session.userId, email, {
          userName: email,
          branch: state.session.branch
        }),
        ...state.auditLogs
      ]
    }));
    void persistState(snapshot(get()));
    return true;
  },
  logout: () => {
    set((state) => ({
      session: { ...state.session, authenticated: false },
      auditLogs: [
        createAuditEntry("logout", "session", state.session.userId, "logout", {
          userName: state.session.userName,
          branch: state.session.branch
        }),
        ...state.auditLogs
      ]
    }));
    void persistState(snapshot(get()));
    get().pushToast("تم تسجيل الخروج.", "info");
  },
  addVehicle: (input) => {
    const vinCheck = checkDuplicateVin(get().vehicles, input.vin);
    if (!vinCheck.ok) {
      get().pushToast(vinCheck.message ?? "VIN duplicate", "error");
      return { ok: false, message: vinCheck.message ?? "Duplicate VIN" };
    }
    const now = new Date().toISOString();
    const vehicle: Vehicle = {
      id: createId("veh"),
      ...input,
      status: "available",
      photos: 0,
      documents: 0,
      createdAt: now,
      updatedAt: now
    };
    set((state) => ({
      vehicles: [vehicle, ...state.vehicles],
      pendingOperations: [queue("vehicle.create", vehicle.internalNumber, vehicle.id, vehicle), ...state.pendingOperations],
      auditEvents: [legacyAudit("Vehicle created", vehicle.internalNumber), ...state.auditEvents],
      auditLogs: [
        createAuditEntry("create", "vehicle", vehicle.id, vehicle.internalNumber, {
          userName: state.session.userName,
          branch: vehicle.branch
        }, undefined, vehicle),
        ...state.auditLogs
      ],
      timelines: appendTimeline(state.timelines, vehicle.id, "purchase", "Vehicle added", vehicle.internalNumber)
    }));
    void persistState(snapshot(get()));
    get().pushToast(`تمت إضافة ${vehicle.internalNumber}.`, "success");
    return { ok: true, vehicle };
  },
  archiveVehicle: (vehicleId, reason) => {
    const vehicle = get().vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    set((state) => ({
      approvals: [
        {
          id: createId("apr"),
          type: "vehicle-delete",
          title: `أرشفة ${vehicle.internalNumber}`,
          entityLabel: vehicle.internalNumber,
          requestedBy: state.session.userName,
          branch: vehicle.branch,
          status: "pending",
          payload: { vehicleId, reason },
          createdAt: new Date().toISOString()
        },
        ...state.approvals
      ],
      auditLogs: [
        createAuditEntry("archive", "vehicle", vehicleId, vehicle.internalNumber, {
          userName: state.session.userName
        }, vehicle, { reason }),
        ...state.auditLogs
      ]
    }));
    void persistState(snapshot(get()));
    get().pushToast("تم إرسال طلب أرشفة السيارة للموافقة.", "info");
  },
  updateVehicleStatus: (vehicleId, status) => {
    const vehicle = get().vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    set((state) => ({
      vehicles: state.vehicles.map((item) =>
        item.id === vehicleId ? { ...item, status, updatedAt: new Date().toISOString() } : item
      ),
      pendingOperations: [queue("vehicle.update", vehicle.internalNumber, vehicleId, { status }), ...state.pendingOperations],
      auditEvents: [legacyAudit("Vehicle status updated", `${vehicle.internalNumber} -> ${status}`), ...state.auditEvents],
      timelines: appendTimeline(state.timelines, vehicleId, "maintenance", "Status changed", status)
    }));
    void persistState(snapshot(get()));
  },
  addCustomer: (input) => {
    const phoneCheck = checkDuplicateCustomerPhone(get().customers, input.phone);
    if (!phoneCheck.ok) {
      get().pushToast(phoneCheck.message ?? "Duplicate phone", "error");
      return { ok: false, message: phoneCheck.message ?? "Duplicate phone" };
    }
    const customer: Customer = {
      id: createId("cus"),
      ...input,
      notes: input.notes ?? "",
      balance: 0,
      purchases: 0,
      createdAt: new Date().toISOString()
    };
    set((state) => ({
      customers: [customer, ...state.customers],
      pendingOperations: [queue("customer.create", customer.name, customer.id, customer), ...state.pendingOperations],
      auditEvents: [legacyAudit("Customer created", customer.name), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    get().pushToast(`تمت إضافة العميل ${customer.name}.`, "success");
    return customer;
  },
  addLead: (input) => {
    const lead: Lead = {
      id: createId("lead"),
      ...input,
      status: "new",
      note: input.note ?? "",
      nextFollowUp: new Date(Date.now() + 86400000).toISOString()
    };
    set((state) => ({
      leads: [lead, ...state.leads],
      pendingOperations: [queue("lead.create", lead.name, lead.id, lead), ...state.pendingOperations],
      auditEvents: [legacyAudit("Lead created", lead.name), ...state.auditEvents],
      timelines: input.vehicleId
        ? appendTimeline(state.timelines, input.vehicleId, "lead", "New lead", lead.name)
        : state.timelines
    }));
    void persistState(snapshot(get()));
    return lead;
  },
  updateLeadStatus: (leadId, status) => {
    set((state) => ({
      leads: state.leads.map((lead) => (lead.id === leadId ? { ...lead, status: status as Lead["status"] } : lead))
    }));
    void persistState(snapshot(get()));
  },
  addReservation: (input) => {
    const soldCheck = checkVehicleAlreadySold(get().vehicles, input.vehicleId);
    if (!soldCheck.ok) {
      get().pushToast(soldCheck.message ?? "Vehicle sold", "error");
      return { ok: false, message: soldCheck.message ?? "Vehicle sold" };
    }
    const reservation: Reservation = { id: createId("res"), ...input };
    set((state) => ({
      reservations: [reservation, ...state.reservations],
      pendingOperations: [queue("reservation.create", reservation.id, reservation.id, reservation), ...state.pendingOperations],
      timelines: appendTimeline(state.timelines, input.vehicleId, "reservation", "Reservation", reservation.id)
    }));
    get().updateVehicleStatus(input.vehicleId, "reserved");
    void persistState(snapshot(get()));
    get().pushToast("تم إنشاء الحجز.", "success");
    return reservation;
  },
  addInvoice: (input) => {
    const soldCheck = checkVehicleAlreadySold(get().vehicles, input.vehicleId);
    if (!soldCheck.ok) {
      get().pushToast(soldCheck.message ?? "Vehicle sold", "error");
      return { ok: false, message: soldCheck.message ?? "Vehicle sold" };
    }
    if (requiresLargeDiscountApproval(input.discount)) {
      get().requestApproval({
        type: "large-discount",
        title: `خصم كبير على فاتورة ${input.vehicleId}`,
        entityLabel: input.vehicleId,
        requestedBy: get().session.userName,
        branch: get().session.branch,
        payload: input as unknown as Record<string, unknown>
      });
    }
    const invoice: Invoice = {
      id: createId("inv"),
      ...input,
      status: "issued",
      createdAt: new Date().toISOString()
    };
    const vehicle = get().vehicles.find((v) => v.id === input.vehicleId);
    const profit = vehicle
      ? vehicle.salePrice - vehicle.purchasePrice - vehicle.maintenanceCost - vehicle.transportationCost - input.discount
      : 0;
    set((state) => ({
      invoices: [invoice, ...state.invoices],
      pendingOperations: [queue("invoice.create", invoice.id, invoice.id, invoice), ...state.pendingOperations],
      auditEvents: [legacyAudit("Invoice issued", invoice.id), ...state.auditEvents],
      commissions: [
        {
          id: createId("com"),
          employee: "Sara N.",
          vehicleId: input.vehicleId,
          saleId: invoice.id,
          profit,
          rate: 2.5,
          amount: profit * 0.025,
          approved: false
        },
        ...state.commissions
      ],
      timelines: appendTimeline(state.timelines, input.vehicleId, "sale", "Sale completed", invoice.id)
    }));
    get().updateVehicleStatus(input.vehicleId, "sold");
    void persistState(snapshot(get()));
    get().pushToast(`تم إصدار الفاتورة ${invoice.id}.`, "success");
    return invoice;
  },
  reviseInvoice: (invoiceId, payload, reason) => {
    const invoice = get().invoices.find((i) => i.id === invoiceId);
    if (!invoice) return { ok: false, message: "الفاتورة غير موجودة." };
    const printedAt = get().printedInvoices[invoiceId];
    const check = canEditPrintedInvoice({ ...invoice, printedAt, locked: false });
    if (!check.ok) {
      get().requestApproval({
        type: "invoice-revision",
        title: `تعديل فاتورة مطبوعة ${invoiceId}`,
        entityLabel: invoiceId,
        requestedBy: get().session.userName,
        branch: get().session.branch,
        payload: { invoiceId, reason, payload }
      });
      return { ok: false, message: check.message ?? "لا يمكن تعديل الفاتورة." };
    }
    set((state) => ({
      invoices: state.invoices.map((i) => (i.id === invoiceId ? { ...i, ...payload, status: "revised" } : i)),
      invoiceRevisions: [
        {
          id: createId("rev"),
          invoiceId,
          reason,
          previous: invoice,
          revised: payload,
          revisedBy: state.session.userName,
          createdAt: new Date().toISOString()
        },
        ...state.invoiceRevisions
      ],
      auditLogs: [
        createAuditEntry("invoice-revision", "invoice", invoiceId, invoiceId, {
          userName: state.session.userName
        }, invoice, payload),
        ...state.auditLogs
      ]
    }));
    void persistState(snapshot(get()));
    return { ok: true, message: "تم تسجيل التعديل." };
  },
  addExpense: (input) => {
    const expense: Expense = { id: createId("exp"), ...input, createdAt: new Date().toISOString() };
    set((state) => ({
      expenses: [expense, ...state.expenses],
      pendingOperations: [queue("expense.create", expense.category, expense.id, expense), ...state.pendingOperations]
    }));
    void persistState(snapshot(get()));
    return expense;
  },
  recordInstallmentPayment: (input) => {
    const installment = get().installments.find((i) => i.id === input.installmentId);
    if (!installment) return;
    set((state) => ({
      installments: state.installments.map((item) => {
        if (item.id !== input.installmentId) return item;
        const paidAmount = Math.min(item.amount, item.paidAmount + input.amount);
        return { ...item, paidAmount, status: paidAmount >= item.amount ? "paid" : item.status };
      }),
      pendingOperations: [queue("installment.payment", installment.id, installment.id, input), ...state.pendingOperations]
    }));
    void persistState(snapshot(get()));
    get().pushToast("تم تسجيل دفعة القسط.", "success");
  },
  attachLocalFile: (entityLabel) => {
    set((state) => ({
      pendingOperations: [queue("file.attach", entityLabel, createId("file"), { entityLabel }), ...state.pendingOperations]
    }));
    void persistState(snapshot(get()));
  },
  requestApproval: (approval) => {
    set((state) => ({
      approvals: [
        { ...approval, id: createId("apr"), status: "pending", createdAt: new Date().toISOString() },
        ...state.approvals
      ]
    }));
    get().refreshNotifications();
    void persistState(snapshot(get()));
  },
  resolveApproval: (approvalId, approved) => {
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === approvalId
          ? { ...a, status: approved ? "approved" : "rejected", resolvedAt: new Date().toISOString() }
          : a
      )
    }));
    get().refreshNotifications();
    void persistState(snapshot(get()));
  },
  addTag: (entityType, entityId, label, color) => {
    set((state) => ({
      tags: [{ id: createId("tag"), entityType, entityId, label, color }, ...state.tags]
    }));
    void persistState(snapshot(get()));
  },
  addCrmActivity: (activity) => {
    set((state) => ({
      crmActivities: [{ ...activity, id: createId("crm"), createdAt: new Date().toISOString() }, ...state.crmActivities]
    }));
    void persistState(snapshot(get()));
  },
  addConditionReport: (vehicleId, report) => {
    const finalScore = averageScore(report);
    set((state) => ({
      conditionReports: [
        { ...report, id: createId("cond"), vehicleId, finalScore, createdAt: new Date().toISOString() },
        ...state.conditionReports
      ],
      timelines: appendTimeline(state.timelines, vehicleId, "condition", "Condition report", `Score ${finalScore}`)
    }));
    void persistState(snapshot(get()));
  },
  recordPrint: (documentType, entityLabel, template) => {
    const code = verificationCode();
    set((state) => ({
      printJobs: [
        {
          id: createId("print"),
          documentType,
          entityLabel,
          template,
          printedBy: state.session.userName,
          verificationCode: code,
          createdAt: new Date().toISOString()
        },
        ...state.printJobs
      ],
      auditLogs: [
        createAuditEntry("print", "document", code, entityLabel, { userName: state.session.userName }),
        ...state.auditLogs
      ]
    }));
    void persistState(snapshot(get()));
    return code;
  },
  runBackup: (manual = true) => {
    const record: BackupRecord = {
      id: createId("bak"),
      kind: manual ? "manual" : "auto",
      sizeBytes: JSON.stringify(snapshot(get())).length,
      encrypted: true,
      status: "success",
      createdAt: new Date().toISOString()
    };
    set((state) => ({
      backups: [record, ...state.backups],
      auditLogs: [
        createAuditEntry("backup", "backup", record.id, record.id, { userName: state.session.userName }),
        ...state.auditLogs
      ]
    }));
    void persistState(snapshot(get()));
    get().pushToast("تم إنشاء نسخة احتياطية.", "success");
  },
  lockPeriod: (kind, branch) => {
    const key = new Date().toISOString().slice(0, kind === "daily" ? 10 : 7);
    set((state) => ({
      periodLocks: [
        {
          id: createId("lock"),
          kind,
          periodKey: key,
          branch,
          lockedBy: state.session.userName,
          lockedAt: new Date().toISOString()
        },
        ...state.periodLocks
      ]
    }));
    void persistState(snapshot(get()));
    get().pushToast("تم قفل الفترة المالية.", "info");
  },
  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    }));
    void persistState(snapshot(get()));
  },
  refreshNotifications: () => {
    const state = get();
    const notifications = buildSystemNotifications({
      installments: state.installments,
      reservations: state.reservations,
      vehicles: state.vehicles,
      pendingApprovals: state.approvals,
      syncFailed: state.syncStatus === "offline" && state.pendingOperations.length > 0,
      conflictCount: state.conflictMessages.length
    });
    set({ notifications });
  },
  globalSearchResults: () => {
    const state = get();
    return globalSearch(state.searchQuery, {
      vehicles: state.vehicles,
      customers: state.customers,
      leads: state.leads,
      invoices: state.invoices,
      reservations: state.reservations,
      installments: state.installments,
      suppliers: state.suppliers
    });
  },
  transferVehicleBranch: (vehicleId, branch) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) => (v.id === vehicleId ? { ...v, branch, updatedAt: new Date().toISOString() } : v))
    }));
    void persistState(snapshot(get()));
  },
  registerDevice: (device) => {
    set((state) => ({
      devices: [
        {
          ...device,
          id: createId("dev"),
          lastSeenAt: new Date().toISOString()
        },
        ...state.devices
      ]
    }));
    void persistState(snapshot(get()));
  },
  logError: (message, page, stack) => {
    set((state) => ({
      errorLogs: [
        {
          id: createId("err"),
          message,
          page,
          userName: state.session.userName,
          device: "web",
          stack,
          createdAt: new Date().toISOString()
        },
        ...state.errorLogs
      ]
    }));
    void persistState(snapshot(get()));
  },
  setDemoMode: (enabled) => {
    set({ demoMode: enabled });
    get().pushToast(enabled ? "وضع التدريب مفعّل." : "وضع التدريب معطّل.", "info");
    void persistState(snapshot(get()));
  },
  setNetworkStatus: (online) => {
    set({ syncStatus: online ? "online" : "offline" });
    get().refreshNotifications();
  },
  synchronize: async () => {
    if (get().syncStatus === "offline") return;
    set({ syncStatus: "syncing" });
    try {
      const state = get();
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: state.devices[0]?.deviceId ?? "web-dashboard",
          operations: state.pendingOperations
        })
      });
      set((s) => ({
        pendingOperations: [],
        syncStatus: navigator.onLine ? "online" : "offline",
        lastSyncAt: new Date().toISOString(),
        auditEvents: [legacyAudit("Offline queue synchronized", `${s.pendingOperations.length} operations`), ...s.auditEvents]
      }));
      get().pushToast("تمت المزامنة بنجاح.", "success");
    } catch {
      get().logError("Sync failed", "/dashboard");
      get().pushToast("فشلت المزامنة.", "error");
      set({ syncStatus: "online" });
    }
    get().refreshNotifications();
    void persistState(snapshot(get()));
  }
}));

/** @deprecated use useShowroomStore */
export const useOfflineStore = useShowroomStore;
