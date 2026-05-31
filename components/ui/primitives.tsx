"use client";

import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-[#d6a84f]/70";

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm text-white/70">
      <span>{label}</span>
      {children}
      {error && <span className="text-xs text-red-300">{error}</span>}
    </label>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const color =
    status === "available" || status === "paid" || status === "online"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
      : status === "reserved" || status === "pending" || status === "syncing"
        ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
        : status === "sold" || status === "contacted"
          ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
          : status === "offline"
            ? "border-red-400/40 bg-red-400/10 text-red-200"
            : "border-white/20 bg-white/5 text-white/70";

  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", color)}>{label ?? status}</span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled = false
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-gradient-to-r from-[#f3c96b] to-[#a77b34] px-4 py-2 text-sm font-bold text-black shadow-lg shadow-[#d6a84f]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#d6a84f]/60 hover:bg-[#d6a84f]/10 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-10 text-center">
      <p className="text-lg font-bold text-white">{title}</p>
      {hint && <p className="mt-2 text-sm text-white/50">{hint}</p>}
    </div>
  );
}
