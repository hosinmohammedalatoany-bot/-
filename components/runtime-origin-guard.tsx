"use client";

import { useEffect, useState } from "react";
import { isLocalUrl } from "@/lib/runtime-config";

type RuntimePayload = {
  warnings?: string[];
  configuredPublicBaseUrl?: string | null;
  isCloudflareTunnel?: boolean;
};

export function RuntimeOriginGuard() {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const extra: string[] = [];
    const origin = window.location.origin;

    if (process.env.NODE_ENV === "production") {
      const configured =
        process.env.NEXT_PUBLIC_PUBLIC_BASE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim();
      if (configured && isLocalUrl(configured)) {
        extra.push(
          "تحذير: إعداد PUBLIC_BASE_URL يشير إلى عنوان محلي بينما التطبيق يعمل على HTTPS عام."
        );
      }
      if (configured) {
        try {
          if (new URL(configured).origin !== origin) {
            extra.push(
              `الرابط الحالي (${origin}) يختلف عن إعداد البيئة — تم اعتماد الرابط الحالي للطلبات.`
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
        const fromApi = data?.warnings ?? [];
        setMessages([...new Set([...fromApi, ...extra])]);
      })
      .catch(() => {
        if (extra.length) setMessages(extra);
      });
  }, []);

  if (!messages.length) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-amber-500/40 bg-amber-950/95 px-4 py-2 text-center text-xs text-amber-100 shadow-lg"
      role="status"
    >
      {messages.map((m) => (
        <p key={m}>{m}</p>
      ))}
    </div>
  );
}
