"use client";

import { useEffect } from "react";
import { PRINT_ROOT_ID } from "@/lib/print";

/** Ensures #print-root exists for in-page printing (see lib/print.ts). */
export function PrintRootHost() {
  useEffect(() => {
    if (document.getElementById(PRINT_ROOT_ID)) return;
    const root = document.createElement("div");
    root.id = PRINT_ROOT_ID;
    root.className = "print-area";
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
  }, []);

  return null;
}
