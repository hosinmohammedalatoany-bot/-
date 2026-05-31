"use client";

import { useEffect, useState } from "react";
import {
  CLOUDFLARE_TUNNEL_ORIGIN_INFO_AR,
  isCloudflareTunnelHost,
  isLocalUrl
} from "@/lib/runtime-config";

type RuntimePayload = {
  info?: string[];
  warnings?: string[];
  configuredPublicBaseUrl?: string | null;
  isCloudflareTunnel?: boolean;
};

export function RuntimeOriginGuard() {
  const [info, setInfo] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const origin = window.location.origin;
    const onTunnel = isCloudflareTunnelHost(window.location.hostname);

    const clientInfo: string[] = [];
    const clientWarnings: string[] = [];

    if (onTunnel) {
      const configured =
        process.env.NEXT_PUBLIC_PUBLIC_BASE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim();
      if (configured) {
        try {
          if (new URL(configured).origin !== origin) {
            clientInfo.push(...CLOUDFLARE_TUNNEL_ORIGIN_INFO_AR);
          }
        } catch {
          /* ignore */
        }
      }
    } else if (process.env.NODE_ENV === "production") {
      const configured =
        process.env.NEXT_PUBLIC_PUBLIC_BASE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim();
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
        const apiInfo = data?.info ?? [];
        const apiWarnings = data?.warnings ?? [];
        setInfo([...new Set([...apiInfo, ...clientInfo])]);
        setWarnings([...new Set([...apiWarnings, ...clientWarnings])]);
      })
      .catch(() => {
        setInfo(clientInfo);
        setWarnings(clientWarnings);
      });
  }, []);

  if (!info.length && !warnings.length) return null;

  return (
    <>
      {info.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[9998] border-t border-sky-500/35 bg-sky-950/95 px-4 py-2.5 text-center text-xs leading-relaxed text-sky-100 shadow-lg"
          role="status"
        >
          {info.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}
      {warnings.length > 0 && (
        <div
          className={`fixed left-0 right-0 z-[9999] border-t border-amber-500/40 bg-amber-950/95 px-4 py-2 text-center text-xs text-amber-100 shadow-lg ${info.length ? "bottom-[4.5rem]" : "bottom-0"}`}
          role="alert"
        >
          {warnings.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}
    </>
  );
}
