import type { Customer, Lead } from "@/lib/domain";

export type CustomerApiRecord = Record<string, unknown>;
export type LeadApiRecord = Record<string, unknown>;

const leadStatusFromApi: Record<string, Lead["status"]> = {
  interested: "interested",
  contact: "contact",
  reserved: "reserved",
  purchased: "purchased",
  cancelled: "cancelled",
  new: "interested",
  contacted: "contact",
  converted: "purchased"
};

const leadStatusToApi: Record<Lead["status"], string> = {
  interested: "interested",
  contact: "contact",
  reserved: "reserved",
  purchased: "purchased",
  cancelled: "cancelled"
};

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export function customerFromApi(row: CustomerApiRecord): Customer {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    address: String(row.address ?? ""),
    idNumber: String(row.id_number ?? ""),
    balance: num(row.balance),
    purchases: num(row.purchases),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString())
  };
}

export function customerToApi(input: {
  name: string;
  phone: string;
  email: string;
  address: string;
  idNumber: string;
  notes?: string;
  branch?: string;
}) {
  return {
    name: input.name,
    phone: input.phone,
    email: input.email,
    address: input.address,
    id_number: input.idNumber,
    notes: input.notes ?? "",
    branch: input.branch ?? ""
  };
}

export type LeadNoteRecord = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export function leadNoteFromApi(row: Record<string, unknown>): LeadNoteRecord {
  return {
    id: String(row.id),
    body: String(row.body ?? ""),
    authorName: String(row.author_name ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString())
  };
}

export function leadFromApi(row: LeadApiRecord): Lead & { timeline?: LeadNoteRecord[] } {
  const statusKey = String(row.status ?? "interested");
  const vehicleId = row.vehicle_id ? String(row.vehicle_id) : undefined;
  const timeline = Array.isArray(row.timeline)
    ? row.timeline.map((n) => leadNoteFromApi(n as Record<string, unknown>))
    : undefined;
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    source: String(row.source ?? "WhatsApp") as Lead["source"],
    assignedTo: String(row.assigned_to ?? ""),
    vehicleId,
    status: leadStatusFromApi[statusKey] ?? "interested",
    nextFollowUp: String(row.next_follow_up ?? new Date().toISOString()),
    note: String(row.note ?? ""),
    timeline
  };
}

export function leadToApi(input: {
  name: string;
  phone: string;
  source: Lead["source"];
  assignedTo: string;
  vehicleId?: string;
  note?: string;
  status?: Lead["status"];
  branch?: string;
}) {
  return {
    name: input.name,
    phone: input.phone,
    source: input.source,
    assigned_to: input.assignedTo,
    vehicle_id: input.vehicleId || null,
    note: input.note ?? "",
    status: input.status ? leadStatusToApi[input.status] : "interested",
    branch: input.branch ?? ""
  };
}
