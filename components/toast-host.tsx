"use client";

import { useEffect } from "react";
import { useShowroomStore } from "@/lib/showroom-store";
import { cn } from "@/lib/utils";

export function ToastHost() {
  const toasts = useShowroomStore((s) => s.toasts);
  const dismissToast = useShowroomStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      const last = toasts[toasts.length - 1];
      if (last) dismissToast(last.id);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-4 right-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:max-w-md"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismissToast(toast.id)}
          className={cn(
            "pointer-events-auto w-full rounded-xl border px-4 py-3 text-right text-sm font-medium shadow-lg backdrop-blur-md transition",
            toast.tone === "success" && "border-emerald-400/40 bg-emerald-950/90 text-emerald-100",
            toast.tone === "error" && "border-red-400/40 bg-red-950/90 text-red-100",
            toast.tone === "info" && "border-[#d6a84f]/40 bg-black/90 text-white"
          )}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
