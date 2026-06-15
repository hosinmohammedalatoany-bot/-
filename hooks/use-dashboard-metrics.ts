"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useShowroomMetrics } from "@/hooks/use-showroom-metrics";
import { formatCurrency } from "@/lib/utils";

const apiEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

export type DashboardApiMetrics = {
  branch_name?: string;
  available_vehicles: number;
  sold_vehicles: number;
  reserved_vehicles: number;
  maintenance_vehicles?: number;
  customer_count: number;
  lead_count: number;
  total_sales: number;
  total_expenses: number;
  net_profit: number;
  inventory_value: number;
  todays_installments: number;
  overdue_installments: number;
  todays_reservations: number;
  invoice_count?: number;
  generated_at?: string;
};

export function useDashboardMetrics(branchName?: string) {
  const offline = useShowroomMetrics();
  const [apiMetrics, setApiMetrics] = useState<DashboardApiMetrics | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiEnabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (branchName?.trim()) params.set("branch_name", branchName.trim());
      const res = await fetch(`/api/workspace/dashboard?${params.toString()}`, {
        credentials: "include"
      });
      const data = (await res.json()) as { metrics?: DashboardApiMetrics; error?: string };
      if (!res.ok) throw new Error(data.error ?? "تعذر تحميل اللوحة");
      setApiMetrics(data.metrics ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل اللوحة");
      setApiMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [branchName]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(() => {
    if (apiEnabled && apiMetrics) {
      const totalSales = apiMetrics.total_sales;
      const totalExpenses = apiMetrics.total_expenses;
      const actualProfit = apiMetrics.net_profit;
      const inventoryValue = apiMetrics.inventory_value;
      return {
        source: "api" as const,
        loading,
        error,
        refresh: load,
        available: apiMetrics.available_vehicles,
        sold: apiMetrics.sold_vehicles,
        reserved: apiMetrics.reserved_vehicles,
        maintenance: apiMetrics.maintenance_vehicles ?? 0,
        customerCount: apiMetrics.customer_count,
        leadCount: apiMetrics.lead_count,
        totalSales,
        totalExpenses,
        actualProfit,
        inventoryValue,
        expectedProfit: actualProfit,
        overdueInstallments: apiMetrics.overdue_installments,
        todaysInstallments: apiMetrics.todays_installments,
        todaysReservations: apiMetrics.todays_reservations,
        pendingCount: offline.pendingCount,
        topVehicles: offline.topVehicles,
        formatted: {
          totalSales: formatCurrency(totalSales),
          totalExpenses: formatCurrency(totalExpenses),
          actualProfit: formatCurrency(actualProfit),
          inventoryValue: formatCurrency(inventoryValue),
          expectedProfit: formatCurrency(actualProfit)
        }
      };
    }
    return {
      source: "offline" as const,
      loading: false,
      error: apiEnabled ? error : null,
      refresh: load,
      ...offline
    };
  }, [apiMetrics, loading, error, load, offline]);
}
