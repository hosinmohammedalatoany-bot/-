"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ar } from "@/lib/i18n/ar";
import { useActionLog } from "@/hooks/use-action-log";
import { buildPaymentReceiptPrintHtml, buildTableReportHtml } from "@/components/print/document-templates";
import { PrintDocumentActions } from "@/components/print/print-document-actions";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { SelectCustomer, SelectVehicle } from "@/components/modules/form-selectors";
import { ModulePage } from "@/components/modules/module-page";
import { DeleteRowButton } from "@/components/ui/delete-row-button";
import { EmptyState, Field, PrimaryButton, inputClass } from "@/components/ui/primitives";
import { useShowroomStore } from "@/lib/offline-store";
import { reservationFromApi } from "@/lib/sales-map";
import { vehicleFromApi } from "@/lib/vehicles-map";
import { reservationSchema, type ReservationInput } from "@/lib/validation";
import type { Reservation, Vehicle } from "@/lib/domain";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const apiReservationsEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

const emptyReservation: ReservationInput = {
  vehicleId: "",
  customerId: "",
  employee: "",
  deposit: 0,
  expiresAt: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16)
};

export function ReservationsModule() {
  const storeVehicles = useShowroomStore((s) => s.vehicles);
  const storeCustomers = useShowroomStore((s) => s.customers);
  const storeReservations = useShowroomStore((s) => s.reservations);
  const addReservationStore = useShowroomStore((s) => s.addReservation);
  const deleteReservationStore = useShowroomStore((s) => s.deleteReservation);
  const { log, items } = useActionLog();
  const [apiReservations, setApiReservations] = useState<Reservation[] | null>(null);
  const [apiVehicles, setApiVehicles] = useState<Vehicle[] | null>(null);
  const [fetching, setFetching] = useState(apiReservationsEnabled);
  const [loading, setLoading] = useState(false);
  const form = useForm<ReservationInput>({ defaultValues: emptyReservation });

  const vehicles = apiReservationsEnabled && apiVehicles !== null ? apiVehicles : storeVehicles;
  const customers = storeCustomers;
  const reservations =
    apiReservationsEnabled && apiReservations !== null ? apiReservations : storeReservations;

  const loadData = useCallback(async () => {
    if (!apiReservationsEnabled) return;
    setFetching(true);
    try {
      const [resRes, vehRes] = await Promise.all([
        fetch("/api/reservations?active=1", { credentials: "include" }),
        fetch("/api/vehicles", { credentials: "include" })
      ]);
      const resData = (await resRes.json()) as { reservations?: unknown[]; error?: string };
      const vehData = (await vehRes.json()) as { vehicles?: unknown[]; error?: string };
      if (!resRes.ok) throw new Error(resData.error ?? "تعذر تحميل الحجوزات");
      if (!vehRes.ok) throw new Error(vehData.error ?? "تعذر تحميل السيارات");
      setApiReservations(
        (resData.reservations ?? []).map((row) =>
          reservationFromApi(row as Record<string, unknown>)
        )
      );
      setApiVehicles(
        (vehData.vehicles ?? []).map((row) =>
          vehicleFromApi(row as Record<string, unknown>)
        )
      );
    } catch (e) {
      log(e instanceof Error ? e.message : "تعذر تحميل الحجوزات");
    } finally {
      setFetching(false);
    }
  }, [log]);

  useEffect(() => {
    if (!apiReservationsEnabled) return;
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const reportHtml = buildTableReportHtml(
    "تقرير الحجوزات",
    ["الحجز", "السيارة", "العميل", "العربون", "الانتهاء"],
    reservations.map((r) => {
      const v = vehicles.find((x) => x.id === r.vehicleId);
      const c = customers.find((x) => x.id === r.customerId);
      return [r.id, v?.internalNumber ?? "—", c?.name ?? "—", formatCurrency(r.deposit), formatDateTime(r.expiresAt)];
    })
  );

  const bookableVehicles = vehicles.filter((v) => v.status !== "sold");

  return (
    <ModulePage moduleKey="reservations">
      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">إنشاء حجز</h3>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (data) => {
            setLoading(true);
            const parsed = reservationSchema.safeParse(data);
            if (!parsed.success) {
              log(parsed.error.issues[0]?.message ?? ar.error);
              setLoading(false);
              return;
            }
            const vehicle = vehicles.find((v) => v.id === parsed.data.vehicleId);
            if (vehicle?.status === "sold") {
              log("السيارة مباعة ولا يمكن حجزها.");
              setLoading(false);
              return;
            }
            if (apiReservationsEnabled) {
              try {
                const res = await fetch("/api/reservations", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(parsed.data)
                });
                const body = (await res.json()) as { error?: string };
                if (!res.ok) throw new Error(body.error ?? "تعذر إنشاء الحجز");
                log(`تم إنشاء الحجز وتحديث حالة السيارة إلى محجوزة.`);
                form.reset(emptyReservation);
                await loadData();
              } catch (e) {
                log(e instanceof Error ? e.message : "تعذر إنشاء الحجز");
              }
            } else {
              const reservation = addReservationStore(parsed.data);
              log(`تم إنشاء الحجز ${reservation.id} وتحديث حالة السيارة إلى محجوزة.`);
              form.reset(emptyReservation);
            }
            setLoading(false);
          })}
        >
          <SelectVehicle register={form.register("vehicleId")} vehicles={bookableVehicles} />
          <SelectCustomer register={form.register("customerId")} customers={customers} />
          <Field label="الموظف">
            <input className={inputClass} {...form.register("employee")} />
          </Field>
          <Field label="العربون">
            <input type="number" className={inputClass} {...form.register("deposit")} />
          </Field>
          <Field label="ينتهي في">
            <input type="datetime-local" className={inputClass} {...form.register("expiresAt")} />
          </Field>
          <div className="md:col-span-2">
            <PrimaryButton disabled={loading}>{loading ? ar.loading : "إنشاء الحجز"}</PrimaryButton>
          </div>
        </form>
      </section>

      <section className="luxury-panel rounded-[2rem] p-5">
        <h3 className="font-bold text-white">الحجوزات النشطة</h3>
        <PrintToolbar title="حجوزات" printHtmlBody={reportHtml} />
        <div className="mt-4 overflow-x-auto">
          {fetching ? (
            <p className="text-sm text-white/50">{ar.loading}</p>
          ) : reservations.length === 0 ? (
            <EmptyState title={ar.noData} />
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="py-2 text-start">الحجز</th>
                  <th className="text-start">السيارة</th>
                  <th className="text-start">العميل</th>
                  <th className="text-start">العربون</th>
                  <th className="text-start">الانتهاء</th>
                  <th className="text-start">{ar.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {reservations.map((r) => {
                  const v = vehicles.find((x) => x.id === r.vehicleId);
                  const c = customers.find((x) => x.id === r.customerId);
                  return (
                    <tr key={r.id}>
                      <td className="py-3">{r.id.slice(0, 8)}…</td>
                      <td>{v?.internalNumber ?? "—"}</td>
                      <td>{c?.name ?? "—"}</td>
                      <td>{formatCurrency(r.deposit)}</td>
                      <td>{formatDateTime(r.expiresAt)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <PrintDocumentActions
                            title={`إيصال حجز ${r.id}`}
                            getHtml={() =>
                              buildPaymentReceiptPrintHtml({
                                receiptNumber: `RES-${r.id.slice(0, 8)}`,
                                amount: r.deposit,
                                payerName: c?.name,
                                reference: r.id,
                                note: "إيصال حجز"
                              })
                            }
                          />
                          <DeleteRowButton
                            onConfirm={async () => {
                              if (apiReservationsEnabled) {
                                const res = await fetch(`/api/reservations/${r.id}`, {
                                  method: "DELETE",
                                  credentials: "include"
                                });
                                const body = (await res.json().catch(() => ({}))) as {
                                  error?: string;
                                };
                                if (!res.ok) {
                                  window.alert(body.error ?? "تعذر إلغاء الحجز");
                                  return;
                                }
                                log(`أُلغي الحجز ${r.id}`);
                                await loadData();
                              } else {
                                const result = deleteReservationStore(r.id);
                                if (!result.ok) window.alert(result.message);
                                else log(`حذف الحجز ${r.id}`);
                              }
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {items.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-white/50">
            {items.slice(0, 5).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    </ModulePage>
  );
}
