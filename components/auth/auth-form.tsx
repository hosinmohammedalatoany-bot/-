"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ar } from "@/lib/i18n/ar";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#d6a84f]/70";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = (await response.json()) as { error?: string; needsSetup?: boolean; user?: unknown };
      if (!response.ok) {
        if (data.needsSetup) {
          router.push("/setup");
          return;
        }
        setMessage({ type: "err", text: data.error ?? ar.error });
        return;
      }
      if (remember && data.user) {
        localStorage.setItem("br_user", JSON.stringify(data.user));
      }
      setMessage({ type: "ok", text: ar.success });
      router.push(nextPath || "/dashboard/dashboard");
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "تعذر الاتصال بالخادم." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="luxury-panel rounded-[2rem] p-8">
        <BrandLogo />
        <h1 className="mt-6 text-center text-2xl font-black text-white">{ar.appFullName}</h1>
        <p className="mt-2 text-center text-sm text-white/55">{ar.login}</p>
        <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-sm text-white/70">
            <span>{ar.email}</span>
            <input className={inputClass} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="grid gap-1.5 text-sm text-white/70">
            <span>{ar.password}</span>
            <div className="relative">
              <input
                className={cn(inputClass, "pe-20")}
                type={showPassword ? "text" : "password"}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 end-2 text-xs text-[#d6a84f]"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? ar.hidePassword : ar.showPassword}
              </button>
            </div>
          </label>
          <label className="flex items-center gap-2 text-sm text-white/60">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            {ar.rememberMe}
          </label>
          {message && (
            <p className={cn("rounded-xl p-3 text-sm", message.type === "ok" ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200")}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-[#f3c96b] to-[#a77b34] px-4 py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? ar.loading : ar.login}
          </button>
        </form>
        <a href="/forgot-password" className="mt-4 block text-center text-sm text-[#d6a84f] hover:underline">
          {ar.forgotPassword}
        </a>
      </div>
    </div>
  );
}

export function SetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branch, setBranch] = useState("الفرع الرئيسي");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, branch })
    });
    const data = (await response.json()) as { error?: string; message?: string };
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? ar.error);
      return;
    }
    setMessage(data.message ?? ar.success);
    setTimeout(() => router.push("/login"), 800);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="luxury-panel rounded-[2rem] p-8">
        <BrandLogo />
        <h1 className="mt-6 text-2xl font-black text-white">{ar.setupTitle}</h1>
        <p className="mt-2 text-sm text-white/55">{ar.setupHint}</p>
        <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
          <input className={inputClass} placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={inputClass} type="email" placeholder={ar.email} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={inputClass} type="password" placeholder={ar.password} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input className={inputClass} placeholder={ar.branch} value={branch} onChange={(e) => setBranch(e.target.value)} />
          {message && <p className="rounded-xl bg-white/10 p-3 text-sm">{message}</p>}
          <button type="submit" disabled={loading} className="rounded-xl bg-gradient-to-r from-[#f3c96b] to-[#a77b34] py-3 font-bold text-black disabled:opacity-50">
            {loading ? ar.loading : "إنشاء المدير العام"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = (await response.json()) as { message?: string; resetUrl?: string };
    setLoading(false);
    setMessage(data.message ?? ar.success);
    setResetUrl(data.resetUrl ?? null);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="luxury-panel rounded-[2rem] p-8">
        <h1 className="text-xl font-black">{ar.forgotPassword}</h1>
        <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
          <input className={inputClass} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" disabled={loading} className="rounded-xl bg-[#d6a84f] py-3 font-bold text-black">
            {ar.sendResetLink}
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-emerald-200">{message}</p>}
        {resetUrl && (
          <p className="mt-2 break-all text-xs text-white/50">
            رابط التطوير: <a href={resetUrl}>{resetUrl}</a>
          </p>
        )}
        <a href="/login" className="mt-4 block text-sm text-[#d6a84f]">
          {ar.back}
        </a>
      </div>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirm })
    });
    const data = (await response.json()) as { error?: string; message?: string };
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? ar.error);
      return;
    }
    setMessage(data.message ?? ar.success);
    setTimeout(() => router.push("/login"), 1000);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="luxury-panel rounded-[2rem] p-8">
        <h1 className="text-xl font-black">{ar.resetPassword}</h1>
        <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
          <input className={inputClass} type="password" placeholder={ar.newPassword} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input className={inputClass} type="password" placeholder={ar.confirmPassword} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {message && <p className="text-sm">{message}</p>}
          <button type="submit" disabled={loading} className="rounded-xl bg-[#d6a84f] py-3 font-bold text-black">
            {ar.save}
          </button>
        </form>
      </div>
    </div>
  );
}
