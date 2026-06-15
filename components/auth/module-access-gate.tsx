"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ModuleKey } from "@/lib/domain";
import { canAccessModule, type ClientUser } from "@/lib/client-permissions";
import { isRememberMeEnabled } from "@/lib/remember-client";
import { ar } from "@/lib/i18n/ar";

function readCachedUser(): ClientUser | null {
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

function cacheUserIfRemembered(user: ClientUser) {
  if (!isRememberMeEnabled()) {
    return;
  }
  try {
    localStorage.setItem("br_user", JSON.stringify(user));
  } catch {
    /* ignore quota errors */
  }
}

export function ModuleAccessGate({
  moduleKey,
  children
}: {
  moduleKey: ModuleKey;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const cached = readCachedUser();
      if (cached && canAccessModule(cached, moduleKey)) {
        if (!cancelled) {
          setState("allowed");
        }
        return;
      }

      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) {
          if (!cancelled) {
            setState("denied");
            router.replace("/login");
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setState("denied");
            router.replace("/dashboard/dashboard");
          }
          return;
        }
        const data = (await res.json()) as { user?: ClientUser };
        const user = data.user;
        if (!user || !canAccessModule(user, moduleKey)) {
          if (!cancelled) {
            setState("denied");
            router.replace("/dashboard/dashboard");
          }
          return;
        }
        cacheUserIfRemembered(user);
        if (!cancelled) {
          setState("allowed");
        }
      } catch {
        if (!cancelled) {
          setState("denied");
          router.replace("/dashboard/dashboard");
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [moduleKey, router]);

  if (state === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-white/60" role="status">
        {ar.loading}
      </div>
    );
  }

  if (state === "denied") {
    return null;
  }

  return <>{children}</>;
}
