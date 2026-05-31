/**
 * Public / API base URL resolution for production, Cloudflare Tunnel, and local dev.
 * Never hardcode powerxerp.com or trycloudflare.com here — use env or request origin.
 */

const PUBLIC_BASE_KEYS = ["NEXT_PUBLIC_PUBLIC_BASE_URL", "NEXT_PUBLIC_APP_URL"] as const;
const API_BASE_KEYS = ["NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_API_URL"] as const;

const LOCAL_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/
];

export function readEnvPublicBaseUrl(): string | undefined {
  for (const key of PUBLIC_BASE_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return v.replace(/\/$/, "");
  }
  return undefined;
}

export function readEnvApiBaseUrl(): string | undefined {
  for (const key of API_BASE_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return v.replace(/\/$/, "");
  }
  return undefined;
}

export function isCloudflareTunnelHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  return h.endsWith(".trycloudflare.com");
}

/** Official production hosts — use PUBLIC_BASE_URL / API_BASE_URL from env when set. */
export function isOfficialProductionHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  return h === "powerxerp.com" || h.endsWith(".powerxerp.com");
}

/** Legacy copy — not shown in UI on tunnel; use logCloudflareTunnelOriginMismatch for dev console only. */
export const CLOUDFLARE_TUNNEL_ORIGIN_INFO_AR = [
  "PUBLIC_BASE_URL / NEXT_PUBLIC_APP_URL لا يطابق الرابط الحالي.",
  "تم اكتشاف Cloudflare Tunnel، لذلك سيتم استخدام الرابط الحالي تلقائياً."
] as const;

/** Developer-only: tunnel env mismatch is expected; never surface to end users. */
export function logCloudflareTunnelOriginMismatch(
  liveOrigin: string,
  configuredPublicUrl: string | null | undefined
): void {
  if (!configuredPublicUrl?.trim()) return;
  let liveHost = "";
  try {
    liveHost = new URL(liveOrigin).host;
  } catch {
    return;
  }
  if (!isCloudflareTunnelHost(liveHost)) return;
  try {
    if (new URL(configuredPublicUrl).origin === liveOrigin) return;
  } catch {
    return;
  }
  const log = typeof console !== "undefined" ? console.info : null;
  log?.(
    "[PowerX ERP] Cloudflare Tunnel: PUBLIC_BASE_URL / NEXT_PUBLIC_APP_URL differs from the live URL; using window.location.origin.",
    { liveOrigin, configuredPublicUrl: configuredPublicUrl.trim() }
  );
}

export function isLocalHostname(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  return LOCAL_HOST_PATTERNS.some((re) => re.test(h));
}

export function isLocalUrl(url: string): boolean {
  try {
    return isLocalHostname(new URL(url).host);
  } catch {
    return /localhost|127\.0\.0\.1|192\.168\./i.test(url);
  }
}

/** Origin from incoming request (tunnel-safe). */
export function resolveOriginFromRequest(request: Request): string | null {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host && !host.startsWith("0.0.0.0")) {
      const proto =
        forwardedProto ??
        (isLocalHostname(host) && !isCloudflareTunnelHost(host) ? "http" : "https");
      return `${proto}://${host}`;
    }
  }

  const host = request.headers.get("host");
  if (host && !host.startsWith("0.0.0.0")) {
    const proto =
      forwardedProto ??
      (isLocalHostname(host) && !isCloudflareTunnelHost(host) ? "http" : "https");
    return `${proto}://${host}`;
  }

  try {
    const origin = new URL(request.url).origin;
    if (!origin.includes("0.0.0.0")) return origin;
  } catch {
    /* fall through */
  }

  return null;
}

/**
 * Server-side public app origin for emails and absolute verify links.
 * Prefers live request origin on Cloudflare Tunnel; env wins only when it matches request.
 */
export function resolvePublicAppOrigin(request?: Request): string {
  const fromEnv = readEnvPublicBaseUrl();
  const fromRequest = request ? resolveOriginFromRequest(request) : null;

  if (fromRequest) {
    try {
      const reqHost = new URL(fromRequest).host;

      // Cloudflare quick tunnel: always the URL in the browser (changes every run).
      if (isCloudflareTunnelHost(reqHost)) {
        return fromRequest;
      }

      // Official production: prefer configured public URL when it matches production domain.
      if (fromEnv && isOfficialProductionHost(reqHost)) {
        const envHost = new URL(fromEnv).host;
        if (isOfficialProductionHost(envHost)) {
          return fromEnv;
        }
      }

      if (fromEnv) {
        const envHost = new URL(fromEnv).host;
        if (envHost !== reqHost) {
          return fromRequest;
        }
      }
      if (!isLocalHostname(reqHost)) {
        if (!fromEnv || isLocalUrl(fromEnv)) {
          return fromRequest;
        }
      }
    } catch {
      return fromRequest;
    }
  }

  if (fromEnv) return fromEnv;
  if (fromRequest) return fromRequest;

  const port = process.env.PORT?.trim() || "3000";
  return `http://localhost:${port}`;
}

/** Client / isomorphic: current page origin first. */
export function resolveClientAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return readEnvPublicBaseUrl() ?? "";
}

/**
 * API base for fetch(). Empty string = same-origin relative paths (/api/...).
 */
export function resolveApiBaseUrl(clientOrigin?: string): string {
  const fromEnv = readEnvApiBaseUrl();
  const origin = clientOrigin ?? resolveClientAppOrigin();

  if (origin) {
    try {
      const host = new URL(origin).host;
      // Quick tunnel: API on same origin unless you explicitly split hosts in production.
      if (isCloudflareTunnelHost(host)) {
        return "";
      }
    } catch {
      /* ignore */
    }
  }

  if (fromEnv && origin && fromEnv.replace(/\/$/, "") === origin.replace(/\/$/, "")) {
    return "";
  }
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "";
}

export function buildApiUrl(path: string, apiBase = resolveApiBaseUrl()): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!apiBase) return normalized;
  return `${apiBase.replace(/\/$/, "")}${normalized}`;
}

export type RuntimeConfigPayload = {
  publicBaseUrl: string;
  apiBaseUrl: string;
  useSameOriginApi: boolean;
  configuredPublicBaseUrl: string | null;
  configuredApiBaseUrl: string | null;
  isCloudflareTunnel: boolean;
  /** Informational only (e.g. env ≠ live tunnel URL — expected behavior). */
  info: string[];
  /** Real misconfiguration (localhost in prod env, etc.). */
  warnings: string[];
};

export function buildRuntimeConfig(request?: Request): RuntimeConfigPayload {
  const configuredPublic = readEnvPublicBaseUrl() ?? null;
  const configuredApi = readEnvApiBaseUrl() ?? null;
  const requestOrigin = request ? resolveOriginFromRequest(request) : null;
  let host = "";
  if (requestOrigin) {
    try {
      host = new URL(requestOrigin).host;
    } catch {
      host = "";
    }
  }
  const isTunnel = isCloudflareTunnelHost(host);

  const publicBase = isTunnel && requestOrigin
    ? requestOrigin
    : requestOrigin ?? configuredPublic ?? "";

  const apiBase = isTunnel ? "" : configuredApi ?? "";

  const info: string[] = [];
  const warnings: string[] = [];

  if (requestOrigin && configuredPublic) {
    try {
      const envHost = new URL(configuredPublic).host;
      const liveHost = new URL(requestOrigin).host;
      if (envHost !== liveHost) {
        if (!isTunnel) {
          warnings.push(
            "PUBLIC_BASE_URL / NEXT_PUBLIC_APP_URL لا يطابق الرابط الحالي — يُستخدم origin الحالي."
          );
        }
        // Tunnel: resolvePublicAppOrigin already uses request origin; no UI banner.
      }
    } catch {
      /* ignore */
    }
  }

  if (
    configuredPublic &&
    isLocalUrl(configuredPublic) &&
    requestOrigin &&
    !isLocalUrl(requestOrigin) &&
    !isTunnel
  ) {
    warnings.push("تم اكتشاف رابط محلي في إعدادات الإنتاج (localhost / 127.0.0.1 / 192.168.x.x).");
  }

  return {
    publicBaseUrl: publicBase,
    apiBaseUrl: apiBase,
    useSameOriginApi: !apiBase,
    configuredPublicBaseUrl: configuredPublic,
    configuredApiBaseUrl: configuredApi,
    isCloudflareTunnel: isTunnel,
    info,
    warnings
  };
}
