import Link from "next/link";
import { formatIqd, type PublicVehicleListItem, vehicleTitle } from "@/lib/public-showroom";

export function VehicleCard({ vehicle }: { vehicle: PublicVehicleListItem }) {
  return (
    <Link
      href={`/showroom/${vehicle.id}`}
      className="luxury-panel group block overflow-hidden rounded-2xl transition hover:border-[#d6a84f]/40"
    >
      <div className="aspect-[4/3] bg-black/50">
        {vehicle.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.thumbnail}
            alt={vehicleTitle(vehicle)}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/30">
            لا توجد صورة
          </div>
        )}
      </div>
      <div className="p-4">
        <h2 className="text-base font-bold text-white">{vehicleTitle(vehicle)}</h2>
        {vehicle.trim && <p className="mt-1 text-xs text-white/50">{vehicle.trim}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#d6a84f]">{formatIqd(vehicle.sale_price)}</p>
          {vehicle.branch && (
            <span className="text-xs text-white/40">{vehicle.branch}</span>
          )}
        </div>
        {vehicle.exterior_color && (
          <p className="mt-2 text-xs text-white/45">اللون: {vehicle.exterior_color}</p>
        )}
      </div>
    </Link>
  );
}
