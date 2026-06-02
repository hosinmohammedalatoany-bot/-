"use client";

import { useEffect } from "react";
import { useShowroomStore } from "@/lib/offline-store";

/** Keeps sync status in sync with the browser and retries queue when back online. */
export function useNetworkSync() {
  const setNetworkStatus = useShowroomStore((s) => s.setNetworkStatus);
  const synchronize = useShowroomStore((s) => s.synchronize);
  const pendingCount = useShowroomStore((s) => s.pendingOperations.length);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const applyStatus = () => setNetworkStatus(navigator.onLine);

    applyStatus();
    window.addEventListener("online", applyStatus);
    window.addEventListener("offline", applyStatus);

    return () => {
      window.removeEventListener("online", applyStatus);
      window.removeEventListener("offline", applyStatus);
    };
  }, [setNetworkStatus]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.onLine || pendingCount === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      void synchronize();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [pendingCount, synchronize]);
}
