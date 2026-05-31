import { type AuditLogEntry, createId } from "@/lib/enterprise";

export type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "print"
  | "export-pdf"
  | "export-excel"
  | "sale"
  | "invoice-revision"
  | "permission-change"
  | "sync"
  | "sync-failed"
  | "approval"
  | "backup";

interface AuditContext {
  userId?: string;
  userName?: string;
  branch?: string;
  device?: string;
}

export function createAuditEntry(
  action: AuditAction,
  entityType: string,
  entityId: string,
  entityLabel: string,
  context: AuditContext,
  before?: unknown,
  after?: unknown
): AuditLogEntry {
  return {
    id: createId("audit"),
    userId: context.userId ?? "system",
    userName: context.userName ?? "System",
    branch: context.branch ?? "Main Showroom",
    device: context.device ?? "web",
    action,
    entityType,
    entityId,
    entityLabel,
    before,
    after,
    createdAt: new Date().toISOString()
  };
}

export function auditActionLabel(action: AuditAction) {
  const labels: Record<AuditAction, string> = {
    login: "تسجيل دخول",
    logout: "تسجيل خروج",
    create: "إضافة",
    update: "تعديل",
    delete: "حذف",
    archive: "أرشفة",
    print: "طباعة",
    "export-pdf": "تصدير PDF",
    "export-excel": "تصدير Excel",
    sale: "بيع سيارة",
    "invoice-revision": "تعديل فاتورة",
    "permission-change": "تغيير صلاحية",
    sync: "مزامنة",
    "sync-failed": "فشل مزامنة",
    approval: "موافقة",
    backup: "نسخ احتياطي"
  };
  return labels[action];
}
