"use client";

import { useCallback, useEffect, useState } from "react";
import { ar } from "@/lib/i18n/ar";
import { PrimaryButton } from "@/components/ui/primitives";

type PendingUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleLabel: string;
  branch: string;
  statusLabel: string;
  emailVerified: boolean;
  createdAt: string;
};

export function UserApprovalsPanel() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/users?status=pending-approval");
      const data = (await response.json()) as { users?: PendingUser[]; error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "تعذر تحميل الطلبات.");
        setUsers([]);
        return;
      }
      setUsers(data.users ?? []);
      setMessage(null);
    } catch {
      setMessage("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/users?status=pending-approval");
        const data = (await response.json()) as { users?: PendingUser[]; error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setMessage(data.error ?? "تعذر تحميل الطلبات.");
          setUsers([]);
          return;
        }
        setUsers(data.users ?? []);
        setMessage(null);
      } catch {
        if (!cancelled) setMessage("تعذر الاتصال بالخادم.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(userId: string, status: "active" | "rejected") {
    setActionId(userId);
    try {
      const response = await fetch("/api/auth/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status })
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setMessage(data.error ?? ar.error);
        return;
      }
      setMessage(data.message ?? ar.success);
      await load();
    } catch {
      setMessage("فشل تحديث الحالة.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <section className="luxury-panel rounded-[2rem] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-white">{ar.pendingUsers}</h3>
          <p className="mt-1 text-sm text-white/55">اعتماد أو رفض حسابات التسجيل الجديدة — يُسجَّل في سجل التدقيق.</p>
        </div>
        <button
          type="button"
          className="text-sm text-[#d6a84f]"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          disabled={loading}
        >
          تحديث
        </button>
      </div>
      {message && <p className="mt-3 rounded-xl bg-white/10 p-2 text-sm">{message}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-white/50">{ar.loading}</p>
      ) : users.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">{ar.noData}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {users.map((user) => (
            <li key={user.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-white">{user.name}</p>
                  <p className="text-white/60" dir="ltr">
                    {user.email}
                  </p>
                  <p className="text-white/50">
                    {user.roleLabel} — {user.branch}
                    {user.phone ? ` — ${user.phone}` : ""}
                  </p>
                  <p className="text-xs text-white/40">
                    {user.statusLabel}
                    {user.emailVerified ? " · بريد مؤكد" : " · بريد غير مؤكد"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <PrimaryButton
                    type="button"
                    disabled={actionId === user.id}
                    onClick={() => setStatus(user.id, "active")}
                  >
                    {actionId === user.id ? ar.loading : ar.approveAccount}
                  </PrimaryButton>
                  <button
                    type="button"
                    disabled={actionId === user.id}
                    className="rounded-xl border border-red-500/40 px-3 py-2 text-xs text-red-200"
                    onClick={() => setStatus(user.id, "rejected")}
                  >
                    {ar.rejectAccount}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
