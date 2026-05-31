"use client";

import type { Invoice, Vehicle } from "@/lib/domain";
import { formatCurrency } from "@/lib/utils";

export type PrintLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
};

export type InstallmentSchedulePrintRow = {
  id: string;
  index: number;
  dueDate: string;
  amount: number;
  status: string;
};

export function lineItemTotal(item: PrintLineItem): number {
  const sub = item.quantity * item.unitPrice - item.discount;
  return sub + item.tax;
}

export function newLineItemId(): string {
  return `li-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function invoiceToDefaultLineItems(invoice: Invoice, vehicle?: Vehicle): PrintLineItem[] {
  const vehicleLabel = vehicle
    ? `بيع مركبة — ${vehicle.manufacturer} ${vehicle.model} ${vehicle.trim} (${vehicle.year})`
    : "بيع مركبة";
  const items: PrintLineItem[] = [
    {
      id: newLineItemId(),
      description: vehicleLabel,
      quantity: 1,
      unitPrice: invoice.total,
      discount: 0,
      tax: 0
    }
  ];
  if (invoice.discount > 0) {
    items.push({
      id: newLineItemId(),
      description: "خصم على الفاتورة",
      quantity: 1,
      unitPrice: -invoice.discount,
      discount: 0,
      tax: 0
    });
  }
  if (invoice.tax > 0) {
    items.push({
      id: newLineItemId(),
      description: "ضريبة",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: invoice.tax
    });
  }
  return items;
}

function escapeCell(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildLineItemsTableHtml(items: PrintLineItem[]): string {
  if (!items.length) {
    return `<p class="muted">لا توجد بنود.</p>`;
  }

  const rows = items
    .map((item, i) => {
      const total = lineItemTotal(item);
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeCell(item.description)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatCurrency(item.unitPrice)}</td>
        <td class="num">${formatCurrency(item.discount)}</td>
        <td class="num">${formatCurrency(item.tax)}</td>
        <td class="num"><strong>${formatCurrency(total)}</strong></td>
      </tr>`;
    })
    .join("");

  const sum = items.reduce((s, it) => s + lineItemTotal(it), 0);

  return `
    <table class="print-items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>الوصف</th>
          <th>الكمية</th>
          <th>سعر الوحدة</th>
          <th>الخصم</th>
          <th>الضريبة</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="6" class="num"><strong>مجموع البنود</strong></td>
          <td class="num"><strong>${formatCurrency(sum)}</strong></td>
        </tr>
      </tfoot>
    </table>
  `;
}

export function installmentsToScheduleRows(
  installments: { id: string; dueDate: string; amount: number; status: string }[]
): InstallmentSchedulePrintRow[] {
  return installments.map((i, idx) => ({
    id: i.id,
    index: idx + 1,
    dueDate: i.dueDate,
    amount: i.amount,
    status: i.status
  }));
}

export function buildInstallmentScheduleTableHtml(rows: InstallmentSchedulePrintRow[]): string {
  if (!rows.length) return `<p class="muted">لا يوجد جدول أقساط.</p>`;
  const body = rows
    .map(
      (r) => `<tr>
        <td>${r.index}</td>
        <td>${escapeCell(r.dueDate)}</td>
        <td class="num">${formatCurrency(r.amount)}</td>
        <td>${escapeCell(r.status)}</td>
      </tr>`
    )
    .join("");
  return `
    <table class="print-items-table">
      <thead>
        <tr><th>رقم</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}
