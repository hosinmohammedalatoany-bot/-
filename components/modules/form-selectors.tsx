"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { Field, inputClass } from "@/components/ui/primitives";
import type { Customer, Vehicle } from "@/lib/domain";

export function SelectVehicle({
  register,
  vehicles,
  label = "السيارة"
}: {
  register: UseFormRegisterReturn;
  vehicles: Vehicle[];
  label?: string;
}) {
  return (
    <Field label={label}>
      <select className={inputClass} {...register}>
        {vehicles.length === 0 ? (
          <option value="">لا توجد سيارات</option>
        ) : (
          vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.internalNumber} — {vehicle.manufacturer} {vehicle.model}
            </option>
          ))
        )}
      </select>
    </Field>
  );
}

export function SelectCustomer({
  register,
  customers,
  label = "العميل"
}: {
  register: UseFormRegisterReturn;
  customers: Customer[];
  label?: string;
}) {
  return (
    <Field label={label}>
      <select className={inputClass} {...register}>
        {customers.length === 0 ? (
          <option value="">لا يوجد عملاء</option>
        ) : (
          customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))
        )}
      </select>
    </Field>
  );
}
