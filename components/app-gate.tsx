"use client";

import { useEffect } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { LoginScreen } from "@/components/login-screen";
import { SetupWizard } from "@/components/setup-wizard";
import { ToastHost } from "@/components/toast-host";
import { useShowroomStore } from "@/lib/showroom-store";

export function AppGate() {
  const hydrate = useShowroomStore((s) => s.hydrate);
  const isHydrated = useShowroomStore((s) => s.isHydrated);
  const setupCompleted = useShowroomStore((s) => s.setup.completed);
  const authenticated = useShowroomStore((s) => s.session.authenticated);
  const registerDevice = useShowroomStore((s) => s.registerDevice);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    registerDevice({
      deviceId: `web-${typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 32) : "unknown"}`,
      platform: typeof navigator !== "undefined" ? navigator.platform : "web",
      appVersion: "0.2.0",
      pendingOps: 0,
      userLabel: "Dashboard"
    });
  }, [isHydrated, registerDevice]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/70">
        <p className="animate-pulse text-sm">جاري تحميل Baraa Raed…</p>
      </div>
    );
  }

  return (
    <>
      {!setupCompleted ? (
        <SetupWizard />
      ) : authenticated ? (
        <DashboardShell />
      ) : (
        <LoginScreen />
      )}
      <ToastHost />
    </>
  );
}
