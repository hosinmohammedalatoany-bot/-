"use client";

import { useEffect, useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { Field, PrimaryButton, SecondaryButton, inputClass } from "@/components/ui/primitives";

type MeUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  branch: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
};

export function AccountSecurityPanel() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = (await res.json()) as { user: MeUser };
        setMe(data.user);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
          logoutOtherDevices: true
        })
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? ar.error);
        return;
      }
      setMessage(data.message ?? "تم تغيير كلمة المرور بنجاح.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMe((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
    } catch {
      setError(ar.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="luxury-panel rounded-[2rem] p-5">
      <h3 className="font-bold text-white">الحساب والأمان</h3>
      <p className="mt-1 text-sm text-white/55">إدارة كلمة المرور والجلسة الحالية.</p>

      {me?.mustChangePassword && (
        <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          يجب تغيير كلمة المرور قبل متابعة العمل (حساب المدير من الإعداد الأولي).
        </p>
      )}

      {me && (
        <dl className="mt-4 grid gap-2 text-sm text-white/70 md:grid-cols-2">
          <div>
            <dt className="text-white/45">الاسم</dt>
            <dd className="font-medium text-white">{me.name}</dd>
          </div>
          <div>
            <dt className="text-white/45">البريد</dt>
            <dd className="font-medium text-white">{me.email}</dd>
          </div>
          <div>
            <dt className="text-white/45">الدور</dt>
            <dd>{me.role}</dd>
          </div>
          <div>
            <dt className="text-white/45">آخر دخول</dt>
            <dd>{me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString("ar-IQ") : "—"}</dd>
          </div>
        </dl>
      )}

      <form className="mt-6 grid max-w-lg gap-3" onSubmit={onChangePassword}>
        <h4 className="text-sm font-semibold text-[#f3c96b]">تغيير كلمة المرور</h4>
        <Field label="كلمة المرور الحالية">
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 left-3 text-xs text-white/50"
              onClick={() => setShowCurrent((v) => !v)}
            >
              {showCurrent ? ar.hidePassword : ar.showPassword}
            </button>
          </div>
        </Field>
        <Field label={ar.newPassword}>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <button
              type="button"
              className="absolute inset-y-0 left-3 text-xs text-white/50"
              onClick={() => setShowNew((v) => !v)}
            >
              {showNew ? ar.hidePassword : ar.showPassword}
            </button>
          </div>
        </Field>
        <Field label={ar.confirmPassword}>
          <input
            type="password"
            className={inputClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {message && <p className="text-sm text-emerald-300">{message}</p>}
        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? ar.loading : "حفظ كلمة المرور"}
          </PrimaryButton>
          <SecondaryButton
            onClick={() => {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setError(null);
              setMessage(null);
            }}
          >
            {ar.cancel}
          </SecondaryButton>
        </div>
      </form>
    </section>
  );
}
