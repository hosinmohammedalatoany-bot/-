"use client";

import { useCallback, useState } from "react";
import {
  newLineItemId,
  type InstallmentSchedulePrintRow,
  type PrintLineItem
} from "@/lib/print-line-items";
import { SecondaryButton, inputClass } from "@/components/ui/primitives";

type EditorMode = "lineItems" | "installmentSchedule";

export function PrintLineItemsEditor({
  mode,
  lineItems,
  scheduleRows,
  onLineItemsChange,
  onScheduleChange,
  onRestore
}: {
  mode: EditorMode;
  lineItems?: PrintLineItem[];
  scheduleRows?: InstallmentSchedulePrintRow[];
  onLineItemsChange?: (items: PrintLineItem[]) => void;
  onScheduleChange?: (rows: InstallmentSchedulePrintRow[]) => void;
  onRestore: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateLineItem = useCallback(
    (id: string, patch: Partial<PrintLineItem>) => {
      if (!lineItems || !onLineItemsChange) return;
      onLineItemsChange(lineItems.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    },
    [lineItems, onLineItemsChange]
  );

  const removeLineItem = useCallback(
    (id: string) => {
      if (!lineItems || !onLineItemsChange) return;
      if (!window.confirm("حذف هذا البند من المعاينة؟")) return;
      onLineItemsChange(lineItems.filter((it) => it.id !== id));
      if (editingId === id) setEditingId(null);
    },
    [lineItems, onLineItemsChange, editingId]
  );

  const addLineItem = useCallback(() => {
    if (!lineItems || !onLineItemsChange) return;
    const item: PrintLineItem = {
      id: newLineItemId(),
      description: "بند جديد",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0
    };
    onLineItemsChange([...lineItems, item]);
    setEditingId(item.id);
  }, [lineItems, onLineItemsChange]);

  const updateSchedule = useCallback(
    (id: string, patch: Partial<InstallmentSchedulePrintRow>) => {
      if (!scheduleRows || !onScheduleChange) return;
      onScheduleChange(scheduleRows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [scheduleRows, onScheduleChange]
  );

  const removeSchedule = useCallback(
    (id: string) => {
      if (!scheduleRows || !onScheduleChange) return;
      if (!window.confirm("حذف هذا السطر من الجدول؟")) return;
      onScheduleChange(scheduleRows.filter((r) => r.id !== id));
    },
    [scheduleRows, onScheduleChange]
  );

  const addScheduleRow = useCallback(() => {
    if (!scheduleRows || !onScheduleChange) return;
    const row: InstallmentSchedulePrintRow = {
      id: newLineItemId(),
      index: scheduleRows.length + 1,
      dueDate: new Date().toISOString().slice(0, 10),
      amount: 0,
      status: "مستحق"
    };
    onScheduleChange([...scheduleRows, row]);
  }, [scheduleRows, onScheduleChange]);

  if (mode === "lineItems" && lineItems) {
    return (
      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white/80">تحرير بنود الفاتورة (للطباعة فقط)</p>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={addLineItem}>+ إضافة بند</SecondaryButton>
            <SecondaryButton onClick={onRestore}>استعادة البنود الأصلية</SecondaryButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs text-white/85">
            <thead className="text-white/50">
              <tr>
                <th className="p-2 text-right">الوصف</th>
                <th className="p-2">كمية</th>
                <th className="p-2">سعر</th>
                <th className="p-2">خصم</th>
                <th className="p-2">ضريبة</th>
                <th className="p-2">{""}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {lineItems.map((item) => (
                <tr key={item.id}>
                  {editingId === item.id ? (
                    <>
                      <td className="p-2">
                        <input
                          className={inputClass}
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className={`${inputClass} w-16`}
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(item.id, { quantity: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className={`${inputClass} w-24`}
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(item.id, { unitPrice: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className={`${inputClass} w-20`}
                          value={item.discount}
                          onChange={(e) =>
                            updateLineItem(item.id, { discount: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className={`${inputClass} w-20`}
                          value={item.tax}
                          onChange={(e) =>
                            updateLineItem(item.id, { tax: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <SecondaryButton onClick={() => setEditingId(null)}>تم</SecondaryButton>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-center">{item.unitPrice}</td>
                      <td className="p-2 text-center">{item.discount}</td>
                      <td className="p-2 text-center">{item.tax}</td>
                      <td className="p-2 space-x-1 space-x-reverse">
                        <SecondaryButton onClick={() => setEditingId(item.id)}>تعديل</SecondaryButton>
                        <SecondaryButton onClick={() => removeLineItem(item.id)}>حذف</SecondaryButton>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === "installmentSchedule" && scheduleRows) {
    return (
      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white/80">تحرير جدول الأقساط (للطباعة فقط)</p>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={addScheduleRow}>+ إضافة قسط</SecondaryButton>
            <SecondaryButton onClick={onRestore}>استعادة الجدول الأصلي</SecondaryButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-white/85">
            <thead className="text-white/50">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">الاستحقاق</th>
                <th className="p-2">المبلغ</th>
                <th className="p-2">الحالة</th>
                <th className="p-2">{""}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {scheduleRows.map((row) => (
                <tr key={row.id}>
                  <td className="p-2">
                    <input
                      type="number"
                      className={`${inputClass} w-14`}
                      value={row.index}
                      onChange={(e) => updateSchedule(row.id, { index: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={inputClass}
                      value={row.dueDate}
                      onChange={(e) => updateSchedule(row.id, { dueDate: e.target.value })}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className={`${inputClass} w-28`}
                      value={row.amount}
                      onChange={(e) => updateSchedule(row.id, { amount: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={inputClass}
                      value={row.status}
                      onChange={(e) => updateSchedule(row.id, { status: e.target.value })}
                    />
                  </td>
                  <td className="p-2">
                    <SecondaryButton onClick={() => removeSchedule(row.id)}>حذف</SecondaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
