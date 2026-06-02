"use client";

import { useNetworkSync } from "@/hooks/use-network-sync";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

export function NetworkSyncBootstrap() {
  useNetworkSync();
  return <PwaInstallPrompt />;
}
