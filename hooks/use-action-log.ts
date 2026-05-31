"use client";

import { useCallback, useState } from "react";

export function useActionLog(initial = "النظام جاهز.") {
  const [items, setItems] = useState<string[]>([initial]);

  const log = useCallback((message: string) => {
    setItems((prev) => [message, ...prev].slice(0, 10));
  }, []);

  return { items, log };
}
