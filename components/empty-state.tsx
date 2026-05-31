import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="max-w-md text-sm text-white/60">{description}</p>
      {action}
    </div>
  );
}
