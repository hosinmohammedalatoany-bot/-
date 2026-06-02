import type { Expense } from "@/lib/domain";
import type { ExpenseInput } from "@/lib/validation";

export type ExpenseApiRecord = Record<string, unknown>;

export type FinancialSummaryApi = {
  revenue: number;
  total_expenses: number;
  net_profit: number;
  invoice_count: number;
  expense_count: number;
  vehicle_profits: VehicleProfitApi[];
};

export type VehicleProfitApi = {
  vehicle_id: string;
  internal_number: string;
  vin: string;
  manufacturer: string;
  model: string;
  branch_name: string;
  status: string;
  net_sale: number;
  purchase_price: number;
  maintenance_cost: number;
  transportation_cost: number;
  linked_expenses: number;
  total_cost: number;
  profit: number;
  invoice_id: string | null;
  document_number: string | null;
  error?: string;
};

export type DailyCashRegisterApi = {
  id: string;
  branch_name: string;
  business_date: string;
  opening_balance: number;
  notes: string;
  is_closed: boolean;
  closed_at: string | null;
  totals: {
    cash_in: number;
    cash_out: number;
    expected_closing: number;
  };
  transactions: CashTransactionApi[];
};

export type CashTransactionApi = {
  id: string;
  direction: "in" | "out";
  amount: number;
  category: string;
  reference_label: string;
  created_at: string;
};

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export function expenseFromApi(row: ExpenseApiRecord): Expense {
  return {
    id: String(row.id),
    category: String(row.category ?? ""),
    amount: num(row.amount),
    branch: String(row.branch_name ?? "الفرع الرئيسي"),
    description: String(row.description ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString())
  };
}

export function expenseToApi(input: ExpenseInput & { vehicleId?: string; expenseType?: string }) {
  return {
    category: input.category,
    amount: input.amount,
    branch_name: input.branch,
    description: input.description,
    expense_type: input.expenseType ?? "general",
    vehicle_id: input.vehicleId || null
  };
}

export function summaryFromApi(row: Record<string, unknown>): FinancialSummaryApi {
  const profits = Array.isArray(row.vehicle_profits) ? row.vehicle_profits : [];
  return {
    revenue: num(row.revenue),
    total_expenses: num(row.total_expenses),
    net_profit: num(row.net_profit),
    invoice_count: num(row.invoice_count),
    expense_count: num(row.expense_count),
    vehicle_profits: profits.map((p) => {
      const item = p as Record<string, unknown>;
      return {
        vehicle_id: String(item.vehicle_id ?? ""),
        internal_number: String(item.internal_number ?? ""),
        vin: String(item.vin ?? ""),
        manufacturer: String(item.manufacturer ?? ""),
        model: String(item.model ?? ""),
        branch_name: String(item.branch_name ?? ""),
        status: String(item.status ?? ""),
        net_sale: num(item.net_sale),
        purchase_price: num(item.purchase_price),
        maintenance_cost: num(item.maintenance_cost),
        transportation_cost: num(item.transportation_cost),
        linked_expenses: num(item.linked_expenses),
        total_cost: num(item.total_cost),
        profit: num(item.profit),
        invoice_id: item.invoice_id ? String(item.invoice_id) : null,
        document_number: item.document_number ? String(item.document_number) : null
      };
    })
  };
}

export function dailyCashFromApi(row: Record<string, unknown>): DailyCashRegisterApi {
  const txs = Array.isArray(row.transactions) ? row.transactions : [];
  const totals = (row.totals as Record<string, unknown>) ?? {};
  return {
    id: String(row.id),
    branch_name: String(row.branch_name ?? ""),
    business_date: String(row.business_date ?? ""),
    opening_balance: num(row.opening_balance),
    notes: String(row.notes ?? ""),
    is_closed: Boolean(row.is_closed),
    closed_at: row.closed_at ? String(row.closed_at) : null,
    totals: {
      cash_in: num(totals.cash_in),
      cash_out: num(totals.cash_out),
      expected_closing: num(totals.expected_closing)
    },
    transactions: txs.map((t) => {
      const tx = t as Record<string, unknown>;
      return {
        id: String(tx.id),
        direction: tx.direction === "out" ? "out" : "in",
        amount: num(tx.amount),
        category: String(tx.category ?? ""),
        reference_label: String(tx.reference_label ?? ""),
        created_at: String(tx.created_at ?? "")
      };
    })
  };
}
