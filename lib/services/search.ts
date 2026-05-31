import type { Customer, Invoice, Lead, Reservation, Vehicle } from "@/lib/domain";
import type { Installment } from "@/lib/domain";
import { type GlobalSearchResult } from "@/lib/enterprise";

export function globalSearch(
  query: string,
  data: {
    vehicles: Vehicle[];
    customers: Customer[];
    leads: Lead[];
    invoices: Invoice[];
    reservations: Reservation[];
    installments: Installment[];
    suppliers: Array<{ id: string; name: string; phone?: string }>;
  }
): GlobalSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: GlobalSearchResult[] = [];

  for (const vehicle of data.vehicles) {
    const haystack = `${vehicle.internalNumber} ${vehicle.vin} ${vehicle.plateNumber} ${vehicle.manufacturer} ${vehicle.model}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: vehicle.id,
        type: "vehicle",
        title: `${vehicle.manufacturer} ${vehicle.model}`,
        subtitle: `${vehicle.internalNumber} · ${vehicle.vin}`,
        href: `/cars?vehicle=${vehicle.id}`
      });
    }
  }

  for (const customer of data.customers) {
    const haystack = `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: customer.id,
        type: "customer",
        title: customer.name,
        subtitle: customer.phone,
        href: `/customers?customer=${customer.id}`
      });
    }
  }

  for (const lead of data.leads) {
    const haystack = `${lead.name} ${lead.phone} ${lead.source}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: lead.id,
        type: "lead",
        title: lead.name,
        subtitle: lead.phone,
        href: `/leads?lead=${lead.id}`
      });
    }
  }

  for (const invoice of data.invoices) {
    if (invoice.id.toLowerCase().includes(q)) {
      results.push({
        id: invoice.id,
        type: "invoice",
        title: `Invoice ${invoice.id}`,
        subtitle: invoice.status,
        href: `/sales?invoice=${invoice.id}`
      });
    }
  }

  for (const reservation of data.reservations) {
    if (reservation.id.toLowerCase().includes(q)) {
      results.push({
        id: reservation.id,
        type: "reservation",
        title: `Reservation ${reservation.id}`,
        subtitle: reservation.vehicleId,
        href: `/reservations?reservation=${reservation.id}`
      });
    }
  }

  for (const installment of data.installments) {
    if (installment.id.toLowerCase().includes(q)) {
      results.push({
        id: installment.id,
        type: "installment",
        title: `Installment ${installment.id}`,
        subtitle: installment.status,
        href: `/installments?installment=${installment.id}`
      });
    }
  }

  for (const supplier of data.suppliers) {
    if (`${supplier.name} ${supplier.phone ?? ""}`.toLowerCase().includes(q)) {
      results.push({
        id: supplier.id,
        type: "supplier",
        title: supplier.name,
        subtitle: supplier.phone ?? "",
        href: `/purchases?supplier=${supplier.id}`
      });
    }
  }

  return results.slice(0, 20);
}
