"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { inputClass } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const apiEnabled = Boolean(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
);

type SearchHit = {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  href: string;
};

export function GlobalSearch({ branchName }: { branchName?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(
    async (query: string) => {
      if (!apiEnabled || query.trim().length < 2) {
        setHits([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query.trim(), limit: "20" });
        if (branchName?.trim()) params.set("branch_name", branchName.trim());
        const res = await fetch(`/api/workspace/search?${params.toString()}`, {
          credentials: "include"
        });
        const data = (await res.json()) as { results?: SearchHit[]; error?: string };
        if (!res.ok) {
          setHits([]);
          return;
        }
        setHits(data.results ?? []);
      } finally {
        setLoading(false);
      }
    },
    [branchName]
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void runSearch(q), 280);
    return () => window.clearTimeout(timer);
  }, [q, open, runSearch]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!apiEnabled) return null;

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          className={cn(inputClass, "pe-10 ps-10")}
          placeholder="بحث شامل (سيارة، عميل، فاتورة…)"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          aria-label="بحث شامل"
        />
        {q && (
          <button
            type="button"
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/50 hover:text-white"
            onClick={() => {
              setQ("");
              setHits([]);
            }}
            aria-label="مسح"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
          {loading && <p className="px-4 py-3 text-sm text-white/50">جاري البحث…</p>}
          {!loading && hits.length === 0 && (
            <p className="px-4 py-3 text-sm text-white/50">لا توجد نتائج.</p>
          )}
          <ul className="max-h-72 overflow-y-auto">
            {hits.map((hit) => (
              <li key={`${hit.type}-${hit.id}`}>
                <Link
                  href={hit.href}
                  className="block px-4 py-3 hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  <p className="text-sm font-semibold text-white">{hit.title}</p>
                  <p className="text-xs text-white/45">{hit.subtitle}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
