import type { UserRole } from "@/lib/server/db";

/** أدوار يمكن اختيارها في صفحة التسجيل العامة (بدون مدير عام). */
export type RegisterableRole = Exclude<UserRole, "super-admin">;

export const registerableRoles: RegisterableRole[] = [
  "sales",
  "accountant",
  "inventory",
  "read-only"
];

export const registerRoleLabelsAr: Record<RegisterableRole, string> = {
  "branch-manager": "مدير فرع",
  sales: "موظف مبيعات",
  accountant: "محاسب",
  inventory: "موظف مخزون",
  "read-only": "مشاهدة فقط"
};

export const defaultBranches = ["الفرع الرئيسي", "بغداد", "البصرة", "أربيل"];

export const userStatusLabelsAr = {
  "pending-approval": "بانتظار الموافقة",
  active: "فعال",
  disabled: "معطل",
  rejected: "مرفوض",
  suspended: "موقوف مؤقتاً"
} as const;

export const loginStatusMessagesAr = {
  "pending-approval": "حسابك بانتظار موافقة المدير. سيتم إشعارك عند التفعيل.",
  disabled: "تم تعطيل هذا الحساب. تواصل مع المدير العام.",
  rejected: "تم رفض طلب إنشاء الحساب. تواصل مع الإدارة.",
  suspended: "الحساب موقوف مؤقتاً. تواصل مع المدير العام."
} as const;
