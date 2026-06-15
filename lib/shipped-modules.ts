import type { ModuleKey } from "@/lib/domain";

/** Modules with full UI + API wiring — safe to show in navigation and route to. */
export const SHIPPED_MODULE_KEYS: readonly ModuleKey[] = [
  "dashboard",
  "cars",
  "customers",
  "leads",
  "sales",
  "installments",
  "inventory",
  "accounting",
  "reservations",
  "printing",
  "permissions",
  "backup-sync",
  "system-health",
  "reports",
  "settings",
  "branches",
  "notifications"
] as const;

const shippedSet = new Set<string>(SHIPPED_MODULE_KEYS);

export function isShippedModule(key: ModuleKey): boolean {
  return shippedSet.has(key);
}
