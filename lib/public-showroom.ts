export type PublicCompany = {
  company_name: string;
  address: string;
  phone: string;
  currency: string;
  logo_data_url: string | null;
};

export type PublicVehicleListItem = {
  id: string;
  manufacturer: string;
  model: string;
  trim: string;
  year: number;
  exterior_color: string;
  fuel_type: string;
  transmission: string;
  mileage: number;
  branch: string;
  status: string;
  sale_price: string;
  thumbnail: string | null;
};

export type PublicVehicleDetail = {
  id: string;
  manufacturer: string;
  model: string;
  trim: string;
  year: number;
  exterior_color: string;
  interior_color: string;
  fuel_type: string;
  transmission: string;
  mileage: number;
  branch: string;
  status: string;
  show_sale_price: boolean;
  sale_price: string | null;
  images: { id: string; caption: string; data_url: string }[];
};

export function vehicleTitle(v: { manufacturer: string; model: string; year: number }) {
  return `${v.manufacturer} ${v.model} — ${v.year}`;
}

/** Normalize Iraqi phone for wa.me (digits only, country code 964). */
export function normalizeWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("964") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 10) return `964${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("7")) return `964${digits}`;
  if (digits.length >= 11) return digits;
  return null;
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function formatIqd(amount: number | string) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(n)} د.ع`;
}

export function inquiryMessage(
  companyName: string,
  vehicle: { manufacturer: string; model: string; year: number; id: string },
  pageUrl: string
) {
  return `مرحباً ${companyName}، أريد الاستفسار عن السيارة:\n${vehicle.manufacturer} ${vehicle.model} ${vehicle.year}\n${pageUrl}`;
}
