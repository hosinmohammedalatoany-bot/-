/**
 * Server-side bridge to Django REST API (JWT auth).
 * Enabled when DJANGO_API_URL or NEXT_PUBLIC_API_BASE_URL points to the API.
 */

const djangoBase = () => {
  const url =
    process.env.DJANGO_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "";
  return url.replace(/\/$/, "");
};

export function isDjangoAuthEnabled() {
  return Boolean(djangoBase());
}

export async function djangoFetch(
  path: string,
  init?: RequestInit & { accessToken?: string }
) {
  const base = djangoBase();
  if (!base) {
    throw new Error("Django API URL not configured");
  }
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (init?.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`);
  }
  const { accessToken: _at, ...rest } = init ?? {};
  return fetch(`${base}${path}`, { ...rest, headers });
}

export type DjangoLoginResult = {
  ok: boolean;
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    branch: string;
    permissions: string[];
    must_change_password?: boolean;
  };
};

/** Map API role slugs to legacy frontend role slugs. */
export function mapDjangoRoleToClient(role: string): string {
  const map: Record<string, string> = {
    admin: "super-admin",
    branch_manager: "branch-manager",
    accountant: "accountant",
    sales: "sales",
    inventory: "inventory",
    read_only: "read-only"
  };
  return map[role] ?? role;
}

export async function djangoLogin(email: string, password: string) {
  const res = await djangoFetch("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  const data = (await res.json()) as DjangoLoginResult & { detail?: string; error?: boolean };
  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      error: typeof data.detail === "string" ? data.detail : "فشل تسجيل الدخول.",
      needsSetup: res.status === 403 && (data as { needs_setup?: boolean }).needs_setup
    };
  }
  return { ok: true as const, data };
}

export function mapClientRoleToDjango(role: string): string {
  const map: Record<string, string> = {
    "super-admin": "admin",
    "branch-manager": "branch_manager",
    accountant: "accountant",
    sales: "sales",
    inventory: "inventory",
    "read-only": "read_only"
  };
  return map[role] ?? role;
}

export function djangoErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  const firstKey = Object.keys(record)[0];
  const val = record[firstKey];
  if (typeof val === "string") return val;
  if (Array.isArray(val) && typeof val[0] === "string") return val[0];
  return fallback;
}

export async function djangoJson<T = unknown>(
  path: string,
  init?: RequestInit & { accessToken?: string }
): Promise<{ status: number; data: T }> {
  const res = await djangoFetch(path, init);
  const text = await res.text();
  let data: T;
  try {
    data = (text ? JSON.parse(text) : {}) as T;
  } catch {
    data = { detail: text } as T;
  }
  return { status: res.status, data };
}

export type DjangoAuthTokens = { access: string; refresh: string };

export function sessionUserFromDjangoPayload(user: DjangoLoginResult["user"]) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: mapDjangoRoleToClient(user.role),
    branch: user.branch,
    permissions: user.permissions
  };
}
