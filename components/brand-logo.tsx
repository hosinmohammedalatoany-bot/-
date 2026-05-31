import { cn } from "@/lib/utils";

export function BrandLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-[#d6a84f]/50 bg-black shadow-2xl shadow-[#d6a84f]/20">
        <svg viewBox="0 0 64 64" aria-hidden="true" className="h-9 w-9">
          <path
            d="M8 38c4-11 11-18 21-21 11-3 21 0 27 9-10-4-20-4-30 0 7-1 14 0 22 4 4 2 7 5 8 10H8Z"
            fill="url(#gold)"
          />
          <path d="M14 42h36" stroke="#fff8d6" strokeWidth="4" strokeLinecap="round" />
          <path d="M21 45a5 5 0 1 0 0 .1M45 45a5 5 0 1 0 0 .1" stroke="#d6a84f" strokeWidth="4" />
          <defs>
            <linearGradient id="gold" x1="7" x2="57" y1="17" y2="42" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff8d6" />
              <stop offset=".45" stopColor="#f3c96b" />
              <stop offset="1" stopColor="#8e682e" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {!compact && (
        <div>
          <p className="gold-text text-xl font-black tracking-[0.08em]">براء رائد</p>
          <p className="text-xs tracking-[0.08em] text-white/60">إدارة معرض السيارات</p>
        </div>
      )}
    </div>
  );
}
