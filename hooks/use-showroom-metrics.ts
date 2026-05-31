"use client";

import { useMemo } from "react";
import { useShowroomStore } from "@/lib/offline-store";
import { formatCurrency } from "@/lib/utils";

export function useShowroomMetrics() {
  const vehicles = useShowroomStore((s) => s.vehicles);
  const customers = useShowroomStore((s) => s.customers);
  const leads = useShowroomStore((s) => s.leads);
  const invoices = useShowroomStore((s) => s.invoices);
  const expenses = useShowroomStore((s) => s.expenses);
  const installments = useShowroomStore((s) => s.installments);
  const reservations = useShowroomStore((s) => s.reservations);
  const pendingOperations = useShowroomStore((s) => s.pendingOperations);

  return useMemo(() => {
    const available = vehicles.filter((v) => v.status === "available").length;
    const sold = vehicles.filter((v) => v.status === "sold").length;
    const reserved = vehicles.filter((v) => v.status === "reserved").length;
    const totalSales = invoices.reduce((sum, inv) => sum + inv.total - inv.discount + inv.tax, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const inventoryValue = vehicles.reduce((sum, v) => sum + v.purchasePrice, 0);
    const expectedProfit = vehicles.reduce(
      (sum, v) => sum + v.salePrice - v.purchasePrice - v.maintenanceCost - v.transportationCost,
      0
    );
    const actualProfit = totalSales - totalExpenses;
    const overdueInstallments = installments.filter((i) => i.status === "overdue").length;
    const todaysInstallments = installments.filter((i) => {
      const due = new Date(i.dueDate);
      return due.toDateString() === new Date().toDateString();
    }).length;
    const todaysReservations = reservations.filter((r) => {
      const exp = new Date(r.expiresAt);
      return exp.toDateString() === new Date().toDateString();
    }).length;

    const topVehicles = [...vehicles]
      .filter((v) => v.status === "sold")
      .slice(0, 5)
      .map((v) => `${v.manufacturer} ${v.model}`);

    return {
      available,
      sold,
      reserved,
      customerCount: customers.length,
      leadCount: leads.length,
      totalSales,
      totalExpenses,
      actualProfit,
      inventoryValue,
      expectedProfit,
      overdueInstallments,
      todaysInstallments,
      todaysReservations,
      pendingCount: pendingOperations.length,
      topVehicles,
      formatted: {
        totalSales: formatCurrency(totalSales),
        totalExpenses: formatCurrency(totalExpenses),
        actualProfit: formatCurrency(actualProfit),
        inventoryValue: formatCurrency(inventoryValue),
        expectedProfit: formatCurrency(expectedProfit)
      }
    };
  }, [vehicles, customers, leads, invoices, expenses, installments, reservations, pendingOperations]);
}
