"use client";

import { ar } from "@/lib/i18n/ar";
import { SecondaryButton } from "@/components/ui/primitives";

export function DeleteRowButton({
  onConfirm,
  label = ar.delete,
  confirmMessage = ar.confirmDelete,
  disabled
}: {
  onConfirm: () => void;
  label?: string;
  confirmMessage?: string;
  disabled?: boolean;
}) {
  return (
    <SecondaryButton
      disabled={disabled}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        onConfirm();
      }}
      className="border-red-400/30 text-red-200 hover:border-red-400/60"
    >
      {label}
    </SecondaryButton>
  );
}
