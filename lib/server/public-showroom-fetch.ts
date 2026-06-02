import { resolvePublicAppOrigin } from "@/lib/runtime-config";
import type { PublicCompany, PublicVehicleDetail, PublicVehicleListItem } from "@/lib/public-showroom";

const djangoBase = () =>
  (
    process.env.DJANGO_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    ""
  ).replace(/\/$/, "");

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function loadPublicCompany(): Promise<PublicCompany | null> {
  const base = djangoBase();
  if (base) {
    const data = await fetchJson<PublicCompany>(`${base}/api/organization/public/company/`);
    if (data) return data;
  }
  const origin = resolvePublicAppOrigin();
  return fetchJson<PublicCompany>(`${origin.replace(/\/$/, "")}/api/public/company`);
}

export async function loadPublicCatalog(q?: string): Promise<{
  count: number;
  vehicles: PublicVehicleListItem[];
}> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  const djangoPath = qs ? `/api/vehicles/public/?${qs}` : "/api/vehicles/public/";
  const nextPath = qs ? `/api/public/vehicles?${qs}` : "/api/public/vehicles";

  const base = djangoBase();
  if (base) {
    const data = await fetchJson<{ count: number; vehicles: PublicVehicleListItem[] }>(
      `${base}${djangoPath}`
    );
    if (data) return data;
  }
  const origin = resolvePublicAppOrigin();
  const data = await fetchJson<{ count: number; vehicles: PublicVehicleListItem[] }>(
    `${origin.replace(/\/$/, "")}${nextPath}`
  );
  return data ?? { count: 0, vehicles: [] };
}

export async function loadPublicVehicle(id: string): Promise<PublicVehicleDetail | null> {
  const base = djangoBase();
  if (base) {
    const data = await fetchJson<PublicVehicleDetail>(`${base}/api/vehicles/public/${id}/`);
    if (data) return data;
  }
  const origin = resolvePublicAppOrigin();
  return fetchJson<PublicVehicleDetail>(
    `${origin.replace(/\/$/, "")}/api/public/vehicles/${id}`
  );
}

export function publicVehiclePageUrl(id: string) {
  const origin = resolvePublicAppOrigin();
  return `${origin.replace(/\/$/, "")}/showroom/${id}`;
}
