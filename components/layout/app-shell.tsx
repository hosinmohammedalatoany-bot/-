"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cloud, CloudOff, LogOut, Menu, RefreshCcw, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { moduleIcons } from "@/components/layout/module-icons";
import { PrimaryButton, SecondaryButton, StatusBadge } from "@/components/ui/primitives";
import { canAccessModule, type ClientUser } from "@/lib/client-permissions";
import { modules, type ModuleKey } from "@/lib/domain";
import { moduleTitlesAr, modulePath, ar } from "@/lib/i18n/ar";
import { isModuleKey } from "@/lib/module-utils";
import { useShowroomStore } from "@/lib/offline-store";
import { cn, formatDateTime } from "@/lib/utils";

function activeModuleFromPath(pathname: string): ModuleKey {
  const parts = pathname.split("/").filter(Boolean);
  const key = parts[1];
  if (key && isModuleKey(key)) {
    return key;
  }
  return "dashboard";
}

function readCachedSessionUser(): ClientUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem("br_user");
    if (raw) {
      return JSON.parse(raw) as ClientUser;
    }
  } catch {
    return null;
  }
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeModule = activeModuleFromPath(pathname);
  const [mobileNav, setMobileNav] = useState(false);
  const [sessionUser, setSessionUser] = useState<ClientUser | null>(readCachedSessionUser);

  const hydrate = useShowroomStore((s) => s.hydrate);
  const syncStatus = useShowroomStore((s) => s.syncStatus);
  const pendingOperations = useShowroomStore((s) => s.pendingOperations);
  const lastSyncAt = useShowroomStore((s) => s.lastSyncAt);
  const setNetworkStatus = useShowroomStore((s) => s.setNetworkStatus);
  const synchronize = useShowroomStore((s) => s.synchronize);
  const setSelectedModule = useShowroomStore((s) => s.setSelectedModule);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("br_user");
          router.replace("/login");
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { user?: ClientUser };
        if (data.user) {
          localStorage.setItem("br_user", JSON.stringify(data.user));
          setSessionUser(data.user);
        }
      })
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    setSelectedModule(activeModule);
  }, [activeModule, setSelectedModule]);

  useEffect(() => {
    const update = () => setNetworkStatus(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setNetworkStatus]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("br_user");
    router.push("/login");
    router.refresh();
  }

  const visibleModules = modules.filter((module) => canAccessModule(sessionUser, module.key));

  const nav = (
    <nav className="space-y-1">
      {visibleModules.map((module) => {
        const href = modulePath(module.key);
        const active = activeModule === module.key;
        return (
          <Link
            key={module.key}
            href={href}
            onClick={() => setMobileNav(false)}
            className={cn(
              "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition",
              active
                ? "border border-[#d6a84f]/45 bg-[#d6a84f]/15 text-[#f3c96b]"
                : "text-white/68 hover:bg-white/8 hover:text-white"
            )}
          >
            <span className="flex items-center gap-2">
              {moduleIcons[module.key]}
              {moduleTitlesAr[module.key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[280px_1fr]">
        <aside className="no-print hidden xl:block">
          <div className="luxury-panel sticky top-5 rounded-[2rem] p-4">
            <BrandLogo />
            <p className="mt-3 text-center text-xs text-white/45">{ar.ownedErp}</p>
            {nav}
          </div>
        </aside>

        {mobileNav && (
          <div className="no-print fixed inset-0 z-50 xl:hidden">
            <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setMobileNav(false)} aria-label="إغلاق" />
            <aside className="absolute start-0 top-0 h-full w-[min(100%,300px)] overflow-auto bg-[#0a0a0a] p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <BrandLogo />
                <button type="button" onClick={() => setMobileNav(false)} className="rounded-lg p-2 text-white/70">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {nav}
            </aside>
          </div>
        )}

        <div className="min-w-0 space-y-4">
          <header className="no-print luxury-panel flex flex-wrap items-center justify-between gap-4 rounded-[2rem] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-xl border border-white/10 p-2 xl:hidden" onClick={() => setMobileNav(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs text-[#d6a84f]">{ar.appName}</p>
                <h1 className="text-lg font-black text-white sm:text-xl">{moduleTitlesAr[activeModule]}</h1>
                {sessionUser?.name && (
                  <p className="text-xs text-white/50">
                    {sessionUser.name}
                    {sessionUser.role ? ` · ${sessionUser.role}` : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-2 text-sm text-white/60">
                {syncStatus === "offline" ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                <StatusBadge
                  status={syncStatus}
                  label={syncStatus === "online" ? ar.online : syncStatus === "syncing" ? ar.syncing : ar.offline}
                />
              </span>
              <span className="text-xs text-white/45">
                {ar.pendingOps}: {pendingOperations.length}
              </span>
              <PrimaryButton onClick={() => void synchronize()} disabled={syncStatus === "offline"}>
                <span className="inline-flex items-center gap-1">
                  <RefreshCcw className="h-4 w-4" />
                  {ar.syncNow}
                </span>
              </PrimaryButton>
              <SecondaryButton onClick={() => logout()}>
                <span className="inline-flex items-center gap-1">
                  <LogOut className="h-4 w-4" />
                  {ar.logout}
                </span>
              </SecondaryButton>
            </div>
          </header>

          <p className="no-print text-xs text-white/40">
            {ar.lastSync}: {lastSyncAt ? formatDateTime(lastSyncAt) : "—"}
          </p>

          <div key={activeModule} className="animate-in fade-in duration-200">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
