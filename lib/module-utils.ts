import type { ModuleKey } from "@/lib/domain";

const MODULE_KEYS: ModuleKey[] = [
  "dashboard",
  "cars",
  "customers",
  "leads",
  "sales",
  "installments",
  "purchases",
  "inventory",
  "accounting",
  "employees",
  "branches",
  "reservations",
  "test-drives",
  "maintenance",
  "insurance",
  "offers",
  "whatsapp",
  "reports",
  "notifications",
  "permissions",
  "printing",
  "backup-sync",
  "system-health",
  "settings"
];

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as string[]).includes(value);
}
