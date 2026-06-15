"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShowroomSearch({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    const trimmed = q.trim();
    if (trimmed) params.set("q", trimmed);
    const path = params.toString() ? `/showroom?${params}` : "/showroom";
    router.push(path);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث عن ماركة أو موديل..."
        className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[#d6a84f]/50 focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-[#d6a84f] px-5 py-3 text-sm font-bold text-black"
      >
        بحث
      </button>
    </form>
  );
}
