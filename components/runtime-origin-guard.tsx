"use client";

import { useEffect, useState } from "react";
import {
  isCloudflareTunnelHost,
  isLocalUrl,
  logCloudflareTunnelOriginMismatch
} from "@/lib/runtime-config";

type RuntimePayload = {
  info?: string[];
  warnings?: string[];
  configuredPublicBaseUrl?: string | null;
  isCloudflareTunnel?: boolean;
};

function readClientConfiguredPublicUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    undefined
  );
}

export function RuntimeOriginGuard() {
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const origin = window.location.origin;
    const onTunnel = isCloudflareTunnelHost(window.location.hostname);
    const configured = readClientConfiguredPublicUrl();

    if (onTunnel) {
      logCloudflareTunnelOriginMismatch(origin, configured ?? null);
    }

    const clientWarnings: string[] = [];

    if (!onTunnel && process.env.NODE_ENV === "production") {
      if (configured && isLocalUrl(configured)) {
        clientWarnings.push(
          "تحذير: إعداد PUBLIC_BASE_URL يشير إلى عنوان محلي بينما التطبيق يعمل على HTTPS عام."
        );
      }
      if (configured) {
        try {
          if (new URL(configured).origin !== origin) {
            clientWarnings.push(
              "PUBLIC_BASE_URL / NEXT_PUBLIC_APP_URL لا يطابق الرابط الحالي — يُستخدم origin الحالي."
            );
          }
        } catch {
          /* ignore */
        }
      }
    }

    fetch("/api/runtime-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RuntimePayload | null) => {
        if (onTunnel || data?.isCloudflareTunnel) {
          setWarnings([]);
          return;
        }
        const apiWarnings = data?.warnings ?? [];
        setWarnings([...new Set([...apiWarnings, ...clientWarnings])]);
      })
      .catch(() => {
        setWarnings(onTunnel ? [] : clientWarnings);
      });
  }, []);

  if (!warnings.length) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-amber-500/40 bg-amber-950/95 px-4 py-2 text-center text-xs text-amber-100 shadow-lg"
      role="alert"
    >
      {warnings.map((m) => (
        <p key={m}>{m}</p>
      ))}
    </div>
  );
}
