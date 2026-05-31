import { buildApiUrl, resolveApiBaseUrl } from "@/lib/runtime-config";

export { resolveApiBaseUrl, buildApiUrl };

/** Same-origin by default; uses NEXT_PUBLIC_API_BASE_URL only when it differs from current origin. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(buildApiUrl(path), init);
}
