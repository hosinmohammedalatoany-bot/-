import { BrandLogo } from "@/components/brand-logo";
import { ar } from "@/lib/i18n/ar";
import { cn } from "@/lib/utils";

export function AuthPageShell({
  title,
  subtitle,
  children,
  wide = false,
  footer
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-page-bg min-h-screen">
      <div
        className={cn(
          "mx-auto flex min-h-screen flex-col justify-center px-4 py-10 lg:py-14",
          wide ? "max-w-4xl" : "max-w-md"
        )}
      >
        <div className={cn("luxury-panel rounded-[2rem] p-8 lg:p-10", wide && "lg:grid lg:grid-cols-2 lg:gap-10")}>
          <div className={wide ? "lg:pe-6" : ""}>
            <BrandLogo />
            <h1 className="mt-6 text-center text-2xl font-black text-white lg:text-start">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-center text-sm text-white/55 lg:text-start">{subtitle}</p>
            )}
          </div>
          <div className={cn(wide ? "mt-8 lg:mt-0" : "mt-8")}>{children}</div>
        </div>
        {footer}
        <p className="mt-6 text-center text-xs text-white/35">{ar.appFullName}</p>
      </div>
    </div>
  );
}
