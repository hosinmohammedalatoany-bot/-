/** Client-side permission checks (mirror server; UI only — API must enforce too). */

export type ClientUser = {
  name?: string;
  email?: string;
  role?: string;
  branch?: string;
  permissions?: string[];
};

const roleDefaults: Record<string, string[]> = {
  "super-admin": ["*"],
  "branch-manager": [
    "dashboard",
    "cars",
    "customers",
    "leads",
    "sales",
    "installments",
    "reports",
    "notifications",
    "branches",
    "settings"
  ],
  sales: ["dashboard", "cars", "customers", "leads", "sales", "reservations", "notifications", "whatsapp"],
  accountant: ["dashboard", "accounting", "installments", "reports", "notifications"],
  inventory: ["dashboard", "cars", "inventory", "purchases", "maintenance"],
  "read-only": ["dashboard", "cars", "customers", "reports"]
};

export function effectiveClientPermissions(user: ClientUser | null | undefined): string[] {
  if (!user) return [];
  if (user.permissions?.length) return user.permissions;
  if (user.role && roleDefaults[user.role]) return roleDefaults[user.role];
  return [];
}

export function canAccessModule(user: ClientUser | null | undefined, moduleKey: string) {
  const permissions = effectiveClientPermissions(user);
  return permissions.includes("*") || permissions.includes(moduleKey);
}

export function canUsePermission(user: ClientUser | null | undefined, permission: string) {
  const permissions = effectiveClientPermissions(user);
  return permissions.includes("*") || permissions.includes(permission);
}
