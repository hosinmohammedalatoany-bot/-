"use client";

import { useEffect, useState } from "react";
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
          router.push("/register");
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
        <a href="/register" className="mt-2 block text-center text-sm text-white/55 hover:text-[#d6a84f]">
          {ar.register}
        </a>
      </div>
    </div>
  );
}

export function SetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [branch, setBranch] = useState("الفرع الرئيسي");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password, branch })
    });
    const data = (await response.json()) as { error?: string; message?: string; user?: unknown };
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? ar.error);
      return;
    }
    if (data.user) {
      localStorage.setItem("br_user", JSON.stringify(data.user));
    }
    setMessage(data.message ?? ar.success);
    router.push("/dashboard/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="luxury-panel rounded-[2rem] p-8">
        <BrandLogo />
        <h1 className="mt-6 text-2xl font-black text-white">{ar.setupTitle}</h1>
        <p className="mt-2 text-sm text-white/55">{ar.setupHint}</p>
        <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
          <input className={inputClass} placeholder={ar.fullName} value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={inputClass} type="email" placeholder={ar.email} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={inputClass} type="tel" placeholder={ar.phone} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={inputClass} type="password" placeholder={ar.password} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input
            className={inputClass}
            type="password"
            placeholder={ar.confirmPassword}
            dir="ltr"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
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

export function RegisterForm() {
  const router = useRouter();
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [firstSetup, setFirstSetup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/register")
      .then((r) => r.json())
      .then((data: { setupCompleted?: boolean; open?: boolean; firstSetup?: boolean; message?: string }) => {
        setFirstSetup(Boolean(data.firstSetup) || data.setupCompleted === false);
        setRegistrationOpen(data.open !== false);
        if (data.open === false && data.setupCompleted !== false) {
          setMessage({ type: "err", text: data.message ?? "التسجيل مغلق حالياً." });
        }
        if (data.firstSetup && data.message) {
          setMessage({ type: "ok", text: data.message });
        }
      })
      .catch(() => setMessage({ type: "err", text: "تعذر تحميل إعدادات التسجيل." }));
  }, [router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          confirmPassword
        })
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        user?: unknown;
      };
      if (!response.ok) {
        setMessage({ type: "err", text: data.error ?? ar.error });
        return;
      }
      if (data.user) {
        localStorage.setItem("br_user", JSON.stringify(data.user));
      }
      setMessage({ type: "ok", text: data.message ?? ar.success });
      router.push("/dashboard/dashboard");
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "تعذر الاتصال بالخادم." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="luxury-panel rounded-[2rem] p-8">
        <BrandLogo />
        <h1 className="mt-6 text-center text-2xl font-black text-white">{ar.appFullName}</h1>
        <p className="mt-2 text-center text-sm text-white/55">
          {firstSetup ? "إنشاء أول حساب (مدير النظام)" : ar.registerTitle}
        </p>
        <p className="mt-1 text-center text-xs text-white/45">
          {firstSetup ? "بعد التسجيل تُفعَّل الحساب فوراً وتنتقل إلى لوحة التحكم." : ar.registerHint}
        </p>
        <form className="mt-6 grid gap-3" onSubmit={onSubmit} noValidate={registrationOpen === false}>
          <input className={inputClass} placeholder={ar.fullName} value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={inputClass} type="email" placeholder={ar.email} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={inputClass} type="tel" placeholder={ar.phone} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <div className="relative">
            <input
              className={cn(inputClass, "pe-20")}
              type={showPassword ? "text" : "password"}
              placeholder={ar.password}
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
          <input
            className={inputClass}
            type="password"
            placeholder={ar.confirmPassword}
            dir="ltr"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {message && (
            <div
              className={cn(
                "rounded-xl p-3 text-sm",
                message.type === "ok" ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"
              )}
            >
              <p>{message.text}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || registrationOpen === false || registrationOpen === null}
            className="rounded-xl bg-gradient-to-r from-[#f3c96b] to-[#a77b34] py-3 font-bold text-black disabled:opacity-50"
          >
            {loading ? ar.loading : ar.register}
          </button>
        </form>
        <a href="/login" className="mt-4 block text-center text-sm text-[#d6a84f] hover:underline">
          {ar.backToLogin}
        </a>
      </div>
    </div>
  );
}

export function VerifyEmailForm({ token }: { token?: string }) {
  const [loading, setLoading] = useState(Boolean(token));
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })
      .then(async (r) => {
        const data = (await r.json()) as { error?: string; message?: string };
        if (cancelled) return;
        if (!r.ok) {
          setMessage({ type: "err", text: data.error ?? ar.error });
          return;
        }
        setMessage({ type: "ok", text: data.message ?? ar.success });
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: "err", text: "تعذر التحقق." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="luxury-panel rounded-[2rem] p-8">
        <BrandLogo />
        <h1 className="mt-6 text-xl font-black">{ar.verifyEmailTitle}</h1>
        {loading && <p className="mt-4 text-sm text-white/60">{ar.loading}</p>}
        {message && (
          <p className={cn("mt-4 rounded-xl p-3 text-sm", message.type === "ok" ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200")}>
            {message.text}
          </p>
        )}
        {!token && <p className="mt-4 text-sm text-red-200">رابط التحقق غير صالح.</p>}
        <a href="/login" className="mt-4 block text-sm text-[#d6a84f]">
          {ar.backToLogin}
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
