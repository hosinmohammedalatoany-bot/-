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
    set({ ...(persisted ?? baseState), isHydrated: true, syncStatus: navigator.onLine ? "online" : "offline" });
  },
  addVehicle: (input) => {
    const duplicate = get().vehicles.some((vehicle) => vehicle.vin.toUpperCase() === input.vin.toUpperCase());
    if (duplicate) {
      const message = `Duplicate VIN blocked: ${input.vin}`;
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
      status: "new",
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

    set({ syncStatus: "syncing" });
    await new Promise((resolve) => setTimeout(resolve, 900));
    set((state) => ({
      pendingOperations: [],
      syncStatus: navigator.onLine ? "online" : "offline",
      lastSyncAt: new Date().toISOString(),
      auditEvents: [audit("Offline queue synchronized", `${state.pendingOperations.length} operations`), ...state.auditEvents]
    }));
    void persistState(snapshot(get()));
  }
}));
