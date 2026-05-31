import type { Invoice } from "@/lib/domain";
import type { PeriodLock } from "@/lib/enterprise";

export function canEditPrintedInvoice(invoice: Invoice & { printedAt?: string; locked?: boolean }) {
  if (invoice.locked) {
    return { ok: false, message: "الفاتورة مقفلة ولا يمكن تعديلها مباشرة." };
  }
  if (invoice.status === "issued" && invoice.printedAt) {
    return { ok: false, message: "الفاتورة مطبوعة. يجب إنشاء سجل تعديل معتمد." };
  }
  return { ok: true };
}

export function isPeriodLocked(locks: PeriodLock[], kind: PeriodLock["kind"], periodKey: string, branch: string) {
  return locks.some((lock) => lock.kind === kind && lock.periodKey === periodKey && lock.branch === branch);
}

export function periodKeyForDate(date: Date, kind: PeriodLock["kind"]) {
  if (kind === "daily") {
    return date.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 7);
}

export function requiresLargeDiscountApproval(discount: number, threshold = 500) {
  return discount >= threshold;
}
