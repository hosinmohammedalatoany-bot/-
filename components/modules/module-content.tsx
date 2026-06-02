"use client";

import type { ModuleKey } from "@/lib/domain";
import { DashboardModule } from "@/components/modules/dashboard-module";
import { CarsModule } from "@/components/modules/cars-module";
import { CustomersModule } from "@/components/modules/customers-module";
import { LeadsModule } from "@/components/modules/leads-module";
import { SalesModule } from "@/components/modules/sales-module";
import { InstallmentsModule } from "@/components/modules/installments-module";
import { InventoryModule } from "@/components/modules/inventory-module";
import { AccountingModule } from "@/components/modules/accounting-module";
import { ReservationsModule } from "@/components/modules/reservations-module";
import { PrintingModule } from "@/components/modules/printing-module";
import { PermissionsModule } from "@/components/modules/permissions-module";
import { BackupSyncModule } from "@/components/modules/backup-sync-module";
import { SystemHealthModule } from "@/components/modules/system-health-module";
import { ReportsModule } from "@/components/modules/reports-module";
import { SettingsModule } from "@/components/modules/settings-module";
import { BranchesModule } from "@/components/modules/branches-module";
import { NotificationsModule } from "@/components/modules/notifications-module";
import { GenericModule } from "@/components/modules/generic-module";

const dedicated: Partial<Record<ModuleKey, React.ComponentType>> = {
  dashboard: DashboardModule,
  cars: CarsModule,
  customers: CustomersModule,
  leads: LeadsModule,
  sales: SalesModule,
  installments: InstallmentsModule,
  inventory: InventoryModule,
  accounting: AccountingModule,
  reservations: ReservationsModule,
  printing: PrintingModule,
  permissions: PermissionsModule,
  "backup-sync": BackupSyncModule,
  "system-health": SystemHealthModule,
  reports: ReportsModule,
  settings: SettingsModule,
  branches: BranchesModule,
  notifications: NotificationsModule
};

export function ModuleContent({ moduleKey }: { moduleKey: ModuleKey }) {
  const Dedicated = dedicated[moduleKey];
  if (Dedicated) {
    return <Dedicated />;
  }
  return <GenericModule moduleKey={moduleKey} />;
}
