"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ar } from "@/lib/i18n/ar";
import { assessPasswordStrength } from "@/lib/password-policy";
import { cn } from "@/lib/utils";
import { Field, PrimaryButton, inputClass } from "@/components/ui/primitives";

function MessageBox({ message }: { message: { type: "ok" | "err"; text: string } | null }) {
  if (!message) return null;
  return (
    <p
      className={cn(
        "rounded-xl p-3 text-sm",
        message.type === "ok" ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"
      )}
      role="alert"
    >
      {message.text}
    </p>
  );
}

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
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe: remember })
      });
      const data = (await response.json()) as {
        error?: string;
        needsSetup?: boolean;
        mustChangePassword?: boolean;
        user?: unknown;
      };
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
      setMessage({ type: "ok", text: "تم تسجيل الدخول بنجاح." });
      if (data.mustChangePassword) {
        router.push("/dashboard/settings");
      } else {
        router.push(nextPath || "/dashboard/dashboard");
      }
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "تعذر الاتصال بالخادم." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell title={ar.appFullName} subtitle={ar.login}>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field label={ar.email}>
          <input
            className={inputClass}
            type="email"
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label={ar.password}>
          <div className="relative">
            <input
              className={cn(inputClass, "pe-20")}
              type={showPassword ? "text" : "password"}
              dir="ltr"
              autoComplete="current-password"
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
        </Field>
        <label className="flex items-center gap-2 text-sm text-white/60">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          {ar.rememberMe}
        </label>
        <MessageBox message={message} />
        <PrimaryButton type="submit" loading={loading} className="w-full py-3">
          {ar.login}
        </PrimaryButton>
      </form>
      <div className="mt-5 flex flex-col gap-2 text-center text-sm">
        <Link href="/forgot-password" className="text-[#d6a84f] hover:underline">
          {ar.forgotPassword}
        </Link>
        <Link href="/register" className="text-white/55 hover:text-[#d6a84f]">
          {ar.register}
        </Link>
      </div>
    </AuthPageShell>
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
    if (loading) return;
    if (password !== confirmPassword) {
      setMessage("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }
    const strength = assessPasswordStrength(password);
    if (!strength.valid) {
      setMessage(strength.message);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, branch })
      });
      const data = (await response.json()) as { error?: string; message?: string; user?: unknown };
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
    } catch {
      setMessage("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell title={ar.setupTitle} subtitle={ar.setupHint}>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <input className={inputClass} placeholder={ar.fullName} value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          className={inputClass}
          type="email"
          placeholder={ar.email}
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input className={inputClass} type="tel" placeholder={ar.phone} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input
          className={inputClass}
          type="password"
          placeholder={ar.password}
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
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
        <PrimaryButton type="submit" loading={loading} className="w-full py-3">
          إنشاء المدير العام
        </PrimaryButton>
      </form>
    </AuthPageShell>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);
    setResetUrl(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = (await response.json()) as { message?: string; resetUrl?: string };
      setMessage(data.message ?? ar.success);
      setResetUrl(data.resetUrl ?? null);
    } catch {
      setMessage("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell title={ar.forgotPassword} subtitle="أدخل بريدك الإلكتروني لاستلام رابط إعادة التعيين.">
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Field label={ar.email}>
          <input className={inputClass} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <PrimaryButton type="submit" loading={loading} className="w-full py-3">
          {ar.sendResetLink}
        </PrimaryButton>
      </form>
      {message && <p className="mt-4 text-sm text-emerald-200">{message}</p>}
      {resetUrl && (
        <p className="mt-2 break-all rounded-xl bg-white/5 p-3 text-xs text-white/50">
          رابط التطوير:{" "}
          <a href={resetUrl} className="text-[#d6a84f] underline">
            {resetUrl}
          </a>
        </p>
      )}
      <Link href="/login" className="mt-5 block text-center text-sm text-[#d6a84f] hover:underline">
        {ar.back}
      </Link>
    </AuthPageShell>
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
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const passwordHint = assessPasswordStrength(password);

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
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || registrationOpen === false) return;
    if (!acceptTerms) {
      setMessage({ type: "err", text: "يجب الموافقة على الشروط والأحكام." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "err", text: "كلمة المرور وتأكيدها غير متطابقين." });
      return;
    }
    if (!passwordHint.valid) {
      setMessage({ type: "err", text: passwordHint.message });
      return;
    }
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
          confirmPassword,
          acceptTerms: true
        })
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        status?: string;
        user?: unknown;
      };
      if (!response.ok) {
        setMessage({ type: "err", text: data.error ?? ar.error });
        return;
      }
      setMessage({ type: "ok", text: data.message ?? ar.success });
      if (data.status === "pending-approval" || !data.user) {
        router.push("/login");
        router.refresh();
        return;
      }
      localStorage.setItem("br_user", JSON.stringify(data.user));
      router.push("/dashboard/dashboard");
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "تعذر الاتصال بالخادم." });
    } finally {
      setLoading(false);
    }
  }

  const subtitle = firstSetup
    ? "إنشاء أول حساب (مدير النظام) — يُفعَّل فوراً."
    : "بعد التسجيل قد ينتظر حسابك موافقة المدير.";

  return (
    <AuthPageShell title={firstSetup ? "إعداد النظام" : ar.registerTitle} subtitle={subtitle} wide>
      <form className="grid gap-3" onSubmit={onSubmit} noValidate={registrationOpen === false}>
        <input className={inputClass} placeholder={ar.fullName} value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          className={inputClass}
          type="email"
          placeholder={ar.email}
          dir="ltr"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="tel"
          placeholder={ar.phone}
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <div className="relative">
          <input
            className={cn(inputClass, "pe-20")}
            type={showPassword ? "text" : "password"}
            placeholder={ar.password}
            dir="ltr"
            autoComplete="new-password"
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
        {password && (
          <p
            className={cn(
              "text-xs",
              passwordHint.strength === "strong"
                ? "text-emerald-300"
                : passwordHint.strength === "fair"
                  ? "text-amber-200"
                  : "text-red-300"
            )}
          >
            {passwordHint.message}
          </p>
        )}
        <input
          className={inputClass}
          type="password"
          placeholder={ar.confirmPassword}
          dir="ltr"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <label className="flex items-start gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            className="mt-1"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <span>أوافق على الشروط والأحكام وسياسة استخدام النظام.</span>
        </label>
        <MessageBox message={message} />
        <PrimaryButton
          type="submit"
          loading={loading}
          disabled={registrationOpen === false || registrationOpen === null}
          className="w-full py-3"
        >
          {ar.register}
        </PrimaryButton>
      </form>
      <Link href="/login" className="mt-4 block text-center text-sm text-[#d6a84f] hover:underline">
        {ar.backToLogin}
      </Link>
    </AuthPageShell>
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
    <AuthPageShell title={ar.verifyEmailTitle}>
      {loading && <p className="text-sm text-white/60">{ar.loading}</p>}
      <MessageBox message={message} />
      {!token && <p className="text-sm text-red-200">رابط التحقق غير صالح.</p>}
      <Link href="/login" className="mt-4 block text-sm text-[#d6a84f] hover:underline">
        {ar.backToLogin}
      </Link>
    </AuthPageShell>
  );
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const strength = assessPasswordStrength(password);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!token) {
      setMessage({ type: "err", text: "رابط إعادة التعيين غير صالح أو منتهي." });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "err", text: "كلمة المرور وتأكيدها غير متطابقين." });
      return;
    }
    if (!strength.valid) {
      setMessage({ type: "err", text: strength.message });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirm })
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setMessage({ type: "err", text: data.error ?? ar.error });
        return;
      }
      setMessage({ type: "ok", text: data.message ?? ar.success });
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setMessage({ type: "err", text: "تعذر الاتصال بالخادم." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell title={ar.resetPassword} subtitle="اختر كلمة مرور قوية جديدة.">
      {!token ? (
        <p className="text-sm text-red-200">الرابط غير صالح. اطلب رابطاً جديداً من صفحة نسيت كلمة المرور.</p>
      ) : (
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Field label={ar.newPassword}>
            <div className="relative">
              <input
                className={cn(inputClass, "pe-20")}
                type={showPassword ? "text" : "password"}
                dir="ltr"
                autoComplete="new-password"
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
          </Field>
          {password && <p className="text-xs text-white/50">{strength.message}</p>}
          <Field label={ar.confirmPassword}>
            <input
              className={inputClass}
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>
          <MessageBox message={message} />
          <PrimaryButton type="submit" loading={loading} className="w-full py-3">
            {ar.save}
          </PrimaryButton>
        </form>
      )}
      <Link href="/login" className="mt-4 block text-center text-sm text-[#d6a84f] hover:underline">
        {ar.backToLogin}
      </Link>
    </AuthPageShell>
  );
}
