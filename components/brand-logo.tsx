import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  variant?: "default" | "horizontal" | "mono" | "print";
};

const horizontalSrc = "/brand/logo.svg";
const monoSrc = "/brand/logo-mono.svg";
const printSrc = "/brand/logo-print.svg";
const iconSrc = "/brand/app-icon.svg";

export function BrandLogo({ className, compact = false, variant = "default" }: BrandLogoProps) {
  const src =
    variant === "mono" ? monoSrc : variant === "print" ? printSrc : variant === "horizontal" ? horizontalSrc : iconSrc;

  if (compact) {
    return (
      <div className={cn("flex items-center", className)}>
        <Image src={iconSrc} alt="baraa raed" width={48} height={48} className="h-12 w-12 rounded-2xl" priority />
      </div>
    );
  }

  if (variant === "default") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-[#d6a84f]/50 bg-black shadow-2xl shadow-[#d6a84f]/20">
          <Image src={iconSrc} alt="" width={48} height={48} className="h-10 w-10" priority aria-hidden />
        </div>
        <div>
          <p className="gold-text text-xl font-black tracking-[0.18em] uppercase">Baraa Raed</p>
          <p className="text-xs uppercase tracking-[0.26em] text-white/60">Car Showroom Management</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <Image
        src={src}
        alt="baraa raed"
        width={variant === "print" ? 360 : 280}
        height={variant === "print" ? 75 : 64}
        className="h-auto w-auto max-w-[min(100%,320px)]"
        priority
      />
    </div>
  );
}
