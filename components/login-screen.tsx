"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useShowroomStore } from "@/lib/showroom-store";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-amber-400/40 focus:ring-2";

export function LoginScreen() {
  const company = useShowroomStore((s) => s.company);
  const login = useShowroomStore((s) => s.login);
  const setup = useShowroomStore((s) => s.setup);
  const [email, setEmail] = useState(setup.adminEmail || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const ok = login(email.trim(), password);
    if (!ok) {
      setError("بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور (4 أحرف على الأقل).");
      return;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="luxury-panel w-full max-w-md rounded-[2rem] p-8">
        <div className="flex flex-col items-center text-center">
          <BrandLogo className="h-14 w-auto" />
          <h1 className="mt-4 text-2xl font-black">{company.companyName || "Baraa Raed"}</h1>
          <p className="mt-2 text-sm text-white/60">تسجيل الدخول لإدارة المعرض</p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-semibold text-white/80">
            البريد الإلكتروني
            <input
              type="email"
              className={cn(inputClass, "mt-2")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-white/80">
            كلمة المرور
            <input
              type="password"
              className={cn(inputClass, "mt-2")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-amber-400"
          >
            <KeyRound className="h-4 w-4" />
            دخول
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-white/45">
          <ShieldCheck className="h-3.5 w-3.5" />
          الجلسة تنتهي تلقائياً عند الخمول · يُسجَّل الدخول في سجل النشاط
        </p>
      </div>
    </div>
  );
}
