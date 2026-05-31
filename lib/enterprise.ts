/** Enterprise types, constants, and pure helpers for Baraa Raed showroom ERP */

export type LeadPipelineStatus =
  | "new"
  | "contacted"
  | "interested"
  | "test-drive"
  | "negotiation"
  | "sold"
  | "not-interested";

export type ApprovalType =
  | "sale"
  | "large-discount"
  | "vehicle-delete"
  | "invoice-revision"
  | "refund"
  | "price-change";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export type NotificationSeverity = "info" | "warning" | "danger" | "success";

export type TagEntity = "vehicle" | "customer" | "lead" | "installment";

export type PrintTemplateKind = "official" | "compact" | "thermal-80" | "legal-contract" | "admin-report";

export type PeriodLockKind = "daily" | "monthly";

export interface CompanyProfile {
  companyName: string;
  logoUrl: string;
  phone: string;
  address: string;
  email: string;
  commercialRegistration: string;
  taxNumber: string;
  currency: string;
  language: "ar" | "en";
  mainBranch: string;
  invoiceTerms: string;
  managerSignatureUrl: string;
  stampUrl: string;
}

export interface SetupState {
  completed: boolean;
  currentStep: number;
  adminEmail: string;
  adminName: string;
  printPaper: "a4" | "thermal-80";
  backupEnabled: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  managerName: string;
}

export interface DeviceSession {
  id: string;
  deviceId: string;
  platform: string;
  appVersion: string;
  lastSeenAt: string;
  pendingOps: number;
  userLabel: string;
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  entityLabel: string;
  requestedBy: string;
  branch: string;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  resolvedAt?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  category:
    | "installment"
    | "reservation"
    | "insurance"
    | "document"
    | "stale-vehicle"
    | "sync"
    | "conflict"
    | "approval"
    | "security";
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  branch: string;
  device: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

export interface EntityTag {
  id: string;
  entityType: TagEntity;
  entityId: string;
  label: string;
  color: string;
}

export interface VehicleTimelineEvent {
  id: string;
  vehicleId: string;
  type:
    | "purchase"
    | "maintenance"
    | "photo"
    | "offer"
    | "reservation"
    | "lead"
    | "sale"
    | "print"
    | "document"
    | "condition";
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface VehicleConditionReport {
  id: string;
  vehicleId: string;
  body: number;
  engine: number;
  transmission: number;
  interior: number;
  paint: number;
  tires: number;
  inspection: number;
  finalScore: number;
  notes: string;
  createdAt: string;
}

export interface CrmActivity {
  id: string;
  customerId: string;
  type: "call" | "whatsapp" | "visit" | "note" | "follow-up";
  summary: string;
  employee: string;
  nextFollowUp?: string;
  createdAt: string;
}

export interface CommissionRecord {
  id: string;
  employee: string;
  vehicleId: string;
  saleId: string;
  profit: number;
  rate: number;
  amount: number;
  approved: boolean;
  paidAt?: string;
}

export interface PrintJobRecord {
  id: string;
  documentType: string;
  entityLabel: string;
  template: PrintTemplateKind;
  printedBy: string;
  verificationCode: string;
  createdAt: string;
}

export interface BackupRecord {
  id: string;
  kind: "auto" | "manual";
  sizeBytes: number;
  encrypted: boolean;
  status: "success" | "failed";
  createdAt: string;
}

export interface ErrorLogEntry {
  id: string;
  message: string;
  page: string;
  userName: string;
  device: string;
  stack?: string;
  createdAt: string;
}

export interface SavedFilter {
  id: string;
  module: string;
  name: string;
  filters: Record<string, string>;
}

export interface PeriodLock {
  id: string;
  kind: PeriodLockKind;
  periodKey: string;
  branch: string;
  lockedBy: string;
  lockedAt: string;
}

export interface InvoiceRevision {
  id: string;
  invoiceId: string;
  reason: string;
  previous: unknown;
  revised: unknown;
  revisedBy: string;
  createdAt: string;
}

export interface GlobalSearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

export const LEAD_PIPELINE: Array<{ key: LeadPipelineStatus; label: string; labelAr: string }> = [
  { key: "new", label: "New", labelAr: "جديد" },
  { key: "contacted", label: "Contacted", labelAr: "تم التواصل" },
  { key: "interested", label: "Interested", labelAr: "مهتم" },
  { key: "test-drive", label: "Test Drive", labelAr: "تجربة قيادة" },
  { key: "negotiation", label: "Negotiation", labelAr: "تفاوض" },
  { key: "sold", label: "Sold", labelAr: "تم البيع" },
  { key: "not-interested", label: "Not Interested", labelAr: "غير مهتم" }
];

export const TAG_PRESETS: Array<{ label: string; color: string; entityTypes: TagEntity[] }> = [
  { label: "Featured", color: "#d6a84f", entityTypes: ["vehicle"] },
  { label: "Needs Maintenance", color: "#f59e0b", entityTypes: ["vehicle"] },
  { label: "Stale Stock", color: "#ef4444", entityTypes: ["vehicle"] },
  { label: "VIP Customer", color: "#8b5cf6", entityTypes: ["customer"] },
  { label: "Hot Lead", color: "#22c55e", entityTypes: ["lead"] },
  { label: "High Risk Installment", color: "#dc2626", entityTypes: ["installment"] }
];

export const WHATSAPP_TEMPLATES = [
  { key: "vehicle-share", title: "Vehicle Details", titleAr: "بيانات السيارة" },
  { key: "price-offer", title: "Price Offer", titleAr: "عرض سعر" },
  { key: "invoice", title: "Invoice", titleAr: "فاتورة" },
  { key: "contract", title: "Contract", titleAr: "عقد" },
  { key: "installment-reminder", title: "Installment Reminder", titleAr: "تذكير قسط" },
  { key: "reservation-reminder", title: "Reservation Reminder", titleAr: "تذكير حجز" },
  { key: "thank-you", title: "Thank You After Sale", titleAr: "شكر بعد البيع" }
] as const;

export const PRINT_TEMPLATES: Array<{ key: PrintTemplateKind; title: string; titleAr: string }> = [
  { key: "official", title: "Official A4", titleAr: "قالب رسمي" },
  { key: "compact", title: "Compact", titleAr: "قالب مختصر" },
  { key: "thermal-80", title: "Thermal 80mm", titleAr: "حراري 80mm" },
  { key: "legal-contract", title: "Legal Contract", titleAr: "عقد قانوني" },
  { key: "admin-report", title: "Admin Report", titleAr: "تقرير إداري" }
];

export const DEFAULT_COMPANY: CompanyProfile = {
  companyName: "Baraa Raed Showroom",
  logoUrl: "/brand/logo-horizontal.svg",
  phone: "+964 770 000 0000",
  address: "Baghdad, Iraq",
  email: "info@baraaraed.com",
  commercialRegistration: "",
  taxNumber: "",
  currency: "USD",
  language: "ar",
  mainBranch: "Main Showroom",
  invoiceTerms: "All sales are final after contract signature unless otherwise agreed in writing.",
  managerSignatureUrl: "",
  stampUrl: ""
};

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function verificationCode() {
  return `BR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function daysBetween(from: string, to = new Date()) {
  return Math.floor((to.getTime() - new Date(from).getTime()) / 86400000);
}

export function isStaleVehicle(updatedAt: string, thresholdDays = 45) {
  return daysBetween(updatedAt) >= thresholdDays;
}

export function averageScore(report: Omit<VehicleConditionReport, "id" | "vehicleId" | "finalScore" | "createdAt">) {
  const values = [report.body, report.engine, report.transmission, report.interior, report.paint, report.tires, report.inspection];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildVerificationUrl(code: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/verify/${code}`;
  }
  return `/verify/${code}`;
}

export function qrImageUrl(text: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(text)}`;
}
