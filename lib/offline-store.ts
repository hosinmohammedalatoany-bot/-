"use client";

import { create } from "zustand";
import {
  type AuditEvent,
  type PrintedDocument,
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
  type CustomerInput,
  type ExpenseInput,
  type InstallmentPaymentInput,
  type InvoiceInput,
  type LeadInput,
  type ReservationInput,
  type VehicleInput
} from "@/lib/validation";

const DB_NAME = "baraa-raed-offline-db";
const DB_VERSION = 1;
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
  printedDocuments: PrintedDocument[];
  lastSyncAt?: string;
}

interface ShowroomState extends PersistedState {
  syncStatus: SyncStatus;
  selectedModule: string;
  isHydrated: boolean;
  conflictMessages: string[];
  setSelectedModule: (module: string) => void;
  hydrate: () => Promise<void>;
  addVehicle: (input: VehicleInput) => { ok: true; vehicle: Vehicle } | { ok: false; message: string };
  updateVehicleStatus: (vehicleId: string, status: Vehicle["status"]) => void;
  addCustomer: (input: CustomerInput) => Customer;
  addLead: (input: LeadInput) => Lead;
  addReservation: (input: ReservationInput) => Reservation;
  addInvoice: (input: InvoiceInput) => Invoice;
  addExpense: (input: ExpenseInput) => Expense;
  recordInstallmentPayment: (input: InstallmentPaymentInput) => void;
  attachLocalFile: (entityLabel: string) => void;
  setNetworkStatus: (online: boolean) => void;
  synchronize: () => Promise<void>;
  recordPrint: (documentType: string, documentNumber: string, branch?: string) => void;
  deleteVehicle: (vehicleId: string) => { ok: true } | { ok: false; message: string };
  deleteCustomer: (customerId: string) => { ok: true } | { ok: false; message: string };
  deleteLead: (leadId: string) => { ok: true } | { ok: false; message: string };
  deleteReservation: (reservationId: string) => { ok: true } | { ok: false; message: string };
  deleteInvoice: (invoiceId: string) => { ok: true } | { ok: false; message: string };
  deleteExpense: (expenseId: string) => { ok: true } | { ok: false; message: string };
  deleteInstallment: (installmentId: string) => { ok: true } | { ok: false; message: string };
  deletePrintedDocument: (documentId: string) => { ok: true } | { ok: false; message: string };
  resetLocalShowroomData: () => Promise<void>;
}

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
  printedDocuments: [],
  lastSyncAt: undefined
};

/** Empty showroom data (no demo/seed records). */
export const factoryEmptyState: PersistedState = {
  vehicles: [],
  customers: [],
  leads: [],
  installments: [],
  expenses: [],
  reservations: [],
  invoices: [],
  pendingOperations: [],
  auditEvents: [],
  printedDocuments: [],
  lastSyncAt: undefined
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

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
  if (typeof indexedDB === "undefined") {
    return undefined;
  }

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
  if (typeof indexedDB === "undefined") {
    return;
  }

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
  return {
    vehicles: state.vehicles,
    customers: state.customers,
    leads: state.leads,
    installments: state.installments,
    expenses: state.expenses,
    reservations: state.reservations,
    invoices: state.invoices,
    pendingOperations: state.pendingOperations,
    auditEvents: state.auditEvents,
    printedDocuments: state.printedDocuments ?? [],
    lastSyncAt: state.lastSyncAt
  };
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

function audit(action: string, target: string): AuditEvent {
  return {
    id: createId("aud"),
    actor: "Current User",
    action,
    target,
    createdAt: new Date().toISOString()
  };
}

export const useShowroomStore = create<ShowroomState>((set, get) => ({
  ...baseState,
  syncStatus: "online",
  selectedModule: "dashboard",
  isHydrated: false,
  conflictMessages: [],
  setSelectedModule: (module) => set({ selectedModule: module }),
  hydrate: async () => {
    const persisted = await readPersistedState();
    set({
      ...(persisted ?? baseState),
      printedDocuments: persisted?.printedDocuments ?? [],
      isHydrated: true,
      syncStatus: navigator.onLine ? "online" : "offline"
    });
  },
  addVehicle: (input) => {
    const duplicateVin = get().vehicles.some((vehicle) => vehicle.vin.toUpperCase() === input.vin.toUpperCase());
    if (duplicateVin) {
      const message = `رقم VIN مكرر: ${input.vin}`;
      set((state) => ({ conflictMessages: [message, ...state.conflictMessages].slice(0, 6) }));
      return { ok: false, message };
    }
    const duplicateInternal = get().vehicles.some(
      (vehicle) => vehicle.internalNumber.trim().toLowerCase() === input.internalNumber.trim().toLowerCase()
    );
    if (duplicateInternal) {
      const message = `الرقم الداخلي مكرر: ${input.internalNumber}`;
      set((state) => ({ conflictMessages: [message, ...state.conflictMessages].slice(0, 6) }));
      return { ok: false, message };
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
      auditEvents: [audit("Vehicle created", vehicle.internalNumber), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    return { ok: true, vehicle };
  },
  updateVehicleStatus: (vehicleId, status) => {
    const vehicle = get().vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) {
      return;
    }

    set((state) => ({
      vehicles: state.vehicles.map((item) =>
        item.id === vehicleId ? { ...item, status, updatedAt: new Date().toISOString() } : item
      ),
      pendingOperations: [queue("vehicle.update", vehicle.internalNumber, vehicleId, { status }), ...state.pendingOperations],
      auditEvents: [audit("Vehicle status updated", `${vehicle.internalNumber} -> ${status}`), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
  },
  addCustomer: (input) => {
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
      auditEvents: [audit("Customer created", customer.name), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    return customer;
  },
  addLead: (input) => {
    const lead: Lead = {
      id: createId("lead"),
      ...input,
      status: "interested",
      note: input.note ?? "",
      nextFollowUp: new Date(Date.now() + 86400000).toISOString()
    };
    set((state) => ({
      leads: [lead, ...state.leads],
      pendingOperations: [queue("lead.create", lead.name, lead.id, lead), ...state.pendingOperations],
      auditEvents: [audit("Lead created", lead.name), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    return lead;
  },
  addReservation: (input) => {
    const reservation: Reservation = {
      id: createId("res"),
      ...input
    };
    set((state) => ({
      reservations: [reservation, ...state.reservations],
      pendingOperations: [
        queue("reservation.create", reservation.id, reservation.id, reservation),
        ...state.pendingOperations
      ],
      auditEvents: [audit("Reservation created", reservation.id), ...state.auditEvents]
    }));
    get().updateVehicleStatus(input.vehicleId, "reserved");
    void persistState(snapshot(get()));
    return reservation;
  },
  addInvoice: (input) => {
    const invoice: Invoice = {
      id: createId("inv"),
      ...input,
      status: "issued",
      createdAt: new Date().toISOString()
    };
    set((state) => ({
      invoices: [invoice, ...state.invoices],
      pendingOperations: [queue("invoice.create", invoice.id, invoice.id, invoice), ...state.pendingOperations],
      auditEvents: [audit("Invoice issued", invoice.id), ...state.auditEvents]
    }));
    get().updateVehicleStatus(input.vehicleId, "sold");
    void persistState(snapshot(get()));
    return invoice;
  },
  addExpense: (input) => {
    const expense: Expense = {
      id: createId("exp"),
      ...input,
      createdAt: new Date().toISOString()
    };
    set((state) => ({
      expenses: [expense, ...state.expenses],
      pendingOperations: [queue("expense.create", expense.category, expense.id, expense), ...state.pendingOperations],
      auditEvents: [audit("Expense recorded", expense.category), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    return expense;
  },
  recordInstallmentPayment: (input) => {
    const installment = get().installments.find((item) => item.id === input.installmentId);
    if (!installment) {
      return;
    }

    set((state) => ({
      installments: state.installments.map((item) => {
        if (item.id !== input.installmentId) {
          return item;
        }
        const paidAmount = Math.min(item.amount, item.paidAmount + input.amount);
        return { ...item, paidAmount, status: paidAmount >= item.amount ? "paid" : item.status };
      }),
      pendingOperations: [
        queue("installment.payment", installment.id, installment.id, input),
        ...state.pendingOperations
      ],
      auditEvents: [audit("Installment payment recorded", installment.id), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
  },
  attachLocalFile: (entityLabel) => {
    set((state) => ({
      pendingOperations: [queue("file.attach", entityLabel, createId("file"), { entityLabel }), ...state.pendingOperations],
      auditEvents: [audit("Local file queued", entityLabel), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
  },
  setNetworkStatus: (online) => set({ syncStatus: online ? "online" : "offline" }),
  synchronize: async () => {
    if (get().syncStatus === "offline") {
      return;
    }

    const pending = get().pendingOperations;
    set({ syncStatus: "syncing" });

    try {
      const deviceId =
        typeof localStorage !== "undefined"
          ? (localStorage.getItem("br_device_id") ??
            (() => {
              const id = `dev-${crypto.randomUUID().slice(0, 8)}`;
              localStorage.setItem("br_device_id", id);
              return id;
            })())
          : "web-client";

      const response = await fetch("/api/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          operations: pending.map((op) => ({
            id: op.id,
            operation: op.operation,
            entityId: op.entityId,
            payload: op.payload,
            createdAt: op.createdAt
          }))
        })
      });

      if (response.status === 401) {
        set({
          syncStatus: navigator.onLine ? "online" : "offline",
          auditEvents: [
            audit("Sync failed — session expired", "يرجى تسجيل الدخول من جديد"),
            ...get().auditEvents
          ]
        });
        void persistState(snapshot(get()));
        return;
      }

      if (!response.ok) {
        throw new Error(`sync ${response.status}`);
      }

      const result = (await response.json()) as { accepted?: number; note?: string };
      set((state) => ({
        pendingOperations: [],
        syncStatus: navigator.onLine ? "online" : "offline",
        lastSyncAt: new Date().toISOString(),
        auditEvents: [
          audit(
            "Offline queue synchronized",
            `${result.accepted ?? pending.length} operations${result.note ? ` — ${result.note}` : ""}`
          ),
          ...state.auditEvents
        ]
      }));
    } catch {
      set((state) => ({
        syncStatus: navigator.onLine ? "online" : "offline",
        auditEvents: [audit("Sync failed", "تعذر الاتصال بالخادم — ستُعاد المحاولة لاحقاً"), ...state.auditEvents]
      }));
    }

    void persistState(snapshot(get()));
  },
  recordPrint: (documentType, documentNumber, branch = "الفرع الرئيسي") => {
    const existing = get().printedDocuments.find((p) => p.documentNumber === documentNumber && p.documentType === documentType);
    const entry: PrintedDocument = existing
      ? {
          ...existing,
          printCount: existing.printCount + 1,
          printedAt: new Date().toISOString(),
          status: "success"
        }
      : {
          id: createId("prt"),
          documentType,
          documentNumber,
          branch,
          printCount: 1,
          status: "success",
          printedAt: new Date().toISOString(),
          actor: "Current User"
        };
    set((state) => ({
      printedDocuments: [
        entry,
        ...state.printedDocuments.filter((p) => p.id !== existing?.id)
      ],
      auditEvents: [audit("طباعة مستند", `${documentType} ${documentNumber}`), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
  },
  deleteVehicle: (vehicleId) => {
    const vehicle = get().vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) {
      return { ok: false, message: "السيارة غير موجودة" };
    }
    if (get().reservations.some((item) => item.vehicleId === vehicleId)) {
      return { ok: false, message: "لا يمكن الحذف: توجد حجوزات مرتبطة بهذه السيارة" };
    }
    if (get().invoices.some((item) => item.vehicleId === vehicleId)) {
      return { ok: false, message: "لا يمكن الحذف: توجد فواتير مرتبطة بهذه السيارة" };
    }
    if (get().installments.some((item) => item.vehicleId === vehicleId)) {
      return { ok: false, message: "لا يمكن الحذف: توجد أقساط مرتبطة بهذه السيارة" };
    }

    set((state) => ({
      vehicles: state.vehicles.filter((item) => item.id !== vehicleId),
      pendingOperations: [
        queue("vehicle.delete", vehicle.internalNumber, vehicleId, { id: vehicleId }),
        ...state.pendingOperations
      ],
      auditEvents: [audit("Vehicle deleted", vehicle.internalNumber), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    return { ok: true };
  },
  deleteCustomer: (customerId) => {
    const customer = get().customers.find((item) => item.id === customerId);
    if (!customer) {
      return { ok: false, message: "العميل غير موجود" };
    }
    if (get().reservations.some((item) => item.customerId === customerId)) {
      return { ok: false, message: "لا يمكن الحذف: توجد حجوزات مرتبطة بهذا العميل" };
    }
    if (get().invoices.some((item) => item.customerId === customerId)) {
      return { ok: false, message: "لا يمكن الحذف: توجد فواتير مرتبطة بهذا العميل" };
    }
    if (get().installments.some((item) => item.customerId === customerId)) {
      return { ok: false, message: "لا يمكن الحذف: توجد أقساط مرتبطة بهذا العميل" };
    }

    set((state) => ({
      customers: state.customers.filter((item) => item.id !== customerId),
      pendingOperations: [
        queue("customer.delete", customer.name, customerId, { id: customerId }),
        ...state.pendingOperations
      ],
      auditEvents: [audit("Customer deleted", customer.name), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    return { ok: true };
  },
  deleteLead: (leadId) => {
    const lead = get().leads.find((item) => item.id === leadId);
    if (!lead) {
      return { ok: false, message: "العميل المحتمل غير موجود" };
    }

    set((state) => ({
      leads: state.leads.filter((item) => item.id !== leadId),
      pendingOperations: [queue("lead.delete", lead.name, leadId, { id: leadId }), ...state.pendingOperations],
      auditEvents: [audit("Lead deleted", lead.name), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    return { ok: true };
  },
  deleteReservation: (reservationId) => {
    const reservation = get().reservations.find((item) => item.id === reservationId);
    if (!reservation) {
      return { ok: false, message: "الحجز غير موجود" };
    }

    const vehicleId = reservation.vehicleId;
    set((state) => {
      const reservations = state.reservations.filter((item) => item.id !== reservationId);
      const vehicle = state.vehicles.find((item) => item.id === vehicleId);
      const stillReserved =
        reservations.some((item) => item.vehicleId === vehicleId) ||
        state.invoices.some((item) => item.vehicleId === vehicleId);
      const vehicles =
        vehicle?.status === "reserved" && !stillReserved
          ? state.vehicles.map((item) =>
              item.id === vehicleId
                ? { ...item, status: "available" as const, updatedAt: new Date().toISOString() }
                : item
            )
          : state.vehicles;

      return {
        reservations,
        vehicles,
        pendingOperations: [
          queue("reservation.delete", reservation.id, reservationId, { id: reservationId }),
          ...state.pendingOperations
        ],
        auditEvents: [audit("Reservation deleted", reservation.id), ...state.auditEvents]
      };
    });
    void persistState(snapshot(get()));
    return { ok: true };
  },
  deleteInvoice: (invoiceId) => {
    const invoice = get().invoices.find((item) => item.id === invoiceId);
    if (!invoice) {
      return { ok: false, message: "الفاتورة غير موجودة" };
    }

    const vehicleId = invoice.vehicleId;
    set((state) => {
      const invoices = state.invoices.filter((item) => item.id !== invoiceId);
      const vehicle = state.vehicles.find((item) => item.id === vehicleId);
      const stillSold =
        invoices.some((item) => item.vehicleId === vehicleId) ||
        state.reservations.some((item) => item.vehicleId === vehicleId);
      const vehicles =
        vehicle?.status === "sold" && !stillSold
          ? state.vehicles.map((item) =>
              item.id === vehicleId
                ? { ...item, status: "available" as const, updatedAt: new Date().toISOString() }
                : item
            )
          : state.vehicles;

      return {
        invoices,
        vehicles,
        pendingOperations: [
          queue("invoice.delete", invoice.id, invoiceId, { id: invoiceId }),
          ...state.pendingOperations
        ],
        auditEvents: [audit("Invoice deleted", invoice.id), ...state.auditEvents]
      };
    });
    void persistState(snapshot(get()));
    return { ok: true };
  },
  deleteExpense: (expenseId) => {
    const expense = get().expenses.find((item) => item.id === expenseId);
    if (!expense) {
      return { ok: false, message: "المصروف غير موجود" };
    }

    set((state) => ({
      expenses: state.expenses.filter((item) => item.id !== expenseId),
      pendingOperations: [
        queue("expense.delete", expense.category, expenseId, { id: expenseId }),
        ...state.pendingOperations
      ],
      auditEvents: [audit("Expense deleted", expense.category), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    return { ok: true };
  },
  deleteInstallment: (installmentId) => {
    const installment = get().installments.find((item) => item.id === installmentId);
    if (!installment) {
      return { ok: false, message: "القسط غير موجود" };
    }

    set((state) => ({
      installments: state.installments.filter((item) => item.id !== installmentId),
      pendingOperations: [
        queue("installment.delete", installment.id, installmentId, { id: installmentId }),
        ...state.pendingOperations
      ],
      auditEvents: [audit("Installment deleted", installment.id), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    return { ok: true };
  },
  deletePrintedDocument: (documentId) => {
    const doc = get().printedDocuments.find((item) => item.id === documentId);
    if (!doc) {
      return { ok: false, message: "سجل الطباعة غير موجود" };
    }

    set((state) => ({
      printedDocuments: state.printedDocuments.filter((item) => item.id !== documentId),
      pendingOperations: [
        queue("print.delete", doc.documentNumber, documentId, { id: documentId }),
        ...state.pendingOperations
      ],
      auditEvents: [audit("Print log deleted", `${doc.documentType} ${doc.documentNumber}`), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
    return { ok: true };
  },
  resetLocalShowroomData: async () => {
    if (typeof indexedDB !== "undefined") {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(STATE_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    set({
      ...factoryEmptyState,
      isHydrated: true,
      conflictMessages: [],
      syncStatus: typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline"
    });
    await persistState(factoryEmptyState);
  }
}));
