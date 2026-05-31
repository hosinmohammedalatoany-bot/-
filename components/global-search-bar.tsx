"use client";

import { useMemo } from "react";
import { useShowroomStore } from "@/lib/showroom-store";

export function GlobalSearchBar() {
  const query = useShowroomStore((s) => s.searchQuery);
  const setSearchQuery = useShowroomStore((s) => s.setSearchQuery);
  const results = useShowroomStore((s) => s.globalSearchResults());

  const visible = useMemo(() => results.slice(0, 8), [results]);

  return (
    <div className="relative w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="بحث شامل: VIN، لوحة، عميل، فاتورة…"
        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm text-white outline-none focus:border-[#d6a84f]/60"
        aria-label="بحث شامل"
      />
      {query.length >= 2 && visible.length > 0 && (
        <ul className="absolute top-full z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-white/15 bg-[#0c0c0c] py-1 shadow-xl">
          {visible.map((hit) => (
            <li key={hit.id} className="border-b border-white/5 px-3 py-2 text-right text-sm last:border-0">
              <span className="text-[10px] uppercase text-[#d6a84f]">{hit.type}</span>
              <p className="font-medium text-white">{hit.title}</p>
              <p className="text-xs text-white/50">{hit.subtitle}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
