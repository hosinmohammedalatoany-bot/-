import type { Installment, Reservation, Vehicle } from "@/lib/domain";
import {
  type SystemNotification,
  createId,
  isStaleVehicle,
  type ApprovalRequest
} from "@/lib/enterprise";

export function buildSystemNotifications(input: {
  installments: Installment[];
  reservations: Reservation[];
  vehicles: Vehicle[];
  pendingApprovals: ApprovalRequest[];
  syncFailed: boolean;
  conflictCount: number;
  newDeviceLogin?: boolean;
}): SystemNotification[] {
  const items: SystemNotification[] = [];

  for (const installment of input.installments.filter((i) => i.status === "overdue")) {
    items.push({
      id: createId("ntf"),
      title: "قسط متأخر",
      body: `القسط ${installment.id} متأخر بمبلغ ${installment.amount - installment.paidAmount}.`,
      severity: "danger",
      category: "installment",
      read: false,
      createdAt: new Date().toISOString(),
      href: "/installments"
    });
  }

  for (const reservation of input.reservations) {
    const hoursLeft = (new Date(reservation.expiresAt).getTime() - Date.now()) / 3600000;
    if (hoursLeft > 0 && hoursLeft <= 48) {
      items.push({
        id: createId("ntf"),
        title: "حجز قرب الانتهاء",
        body: `الحجز ${reservation.id} ينتهي خلال ${Math.ceil(hoursLeft)} ساعة.`,
        severity: "warning",
        category: "reservation",
        read: false,
        createdAt: new Date().toISOString(),
        href: "/reservations"
      });
    }
  }

  for (const vehicle of input.vehicles.filter((v) => v.status === "available" && isStaleVehicle(v.updatedAt))) {
    items.push({
      id: createId("ntf"),
      title: "سيارة راكدة",
      body: `${vehicle.internalNumber} متاحة منذ فترة طويلة.`,
      severity: "warning",
      category: "stale-vehicle",
      read: false,
      createdAt: new Date().toISOString(),
      href: `/cars?vehicle=${vehicle.id}`
    });
  }

  if (input.syncFailed) {
    items.push({
      id: createId("ntf"),
      title: "فشل المزامنة",
      body: "تعذر مزامنة العمليات المحلية مع الخادم.",
      severity: "danger",
      category: "sync",
      read: false,
      createdAt: new Date().toISOString(),
      href: "/backup-sync"
    });
  }

  if (input.conflictCount > 0) {
    items.push({
      id: createId("ntf"),
      title: "تعارض بيانات",
      body: `يوجد ${input.conflictCount} تعارض يحتاج مراجعة.`,
      severity: "warning",
      category: "conflict",
      read: false,
      createdAt: new Date().toISOString(),
      href: "/backup-sync"
    });
  }

  for (const approval of input.pendingApprovals.filter((a) => a.status === "pending")) {
    items.push({
      id: createId("ntf"),
      title: "طلب موافقة مدير",
      body: approval.title,
      severity: "info",
      category: "approval",
      read: false,
      createdAt: new Date().toISOString(),
      href: "/approvals"
    });
  }

  if (input.newDeviceLogin) {
    items.push({
      id: createId("ntf"),
      title: "دخول من جهاز جديد",
      body: "تم تسجيل دخول من جهاز غير معروف.",
      severity: "warning",
      category: "security",
      read: false,
      createdAt: new Date().toISOString(),
      href: "/system-health"
    });
  }

  return items;
}
