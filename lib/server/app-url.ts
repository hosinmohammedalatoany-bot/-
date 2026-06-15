import { resolvePublicAppOrigin } from "@/lib/runtime-config";

/** @deprecated Import resolvePublicAppOrigin from @/lib/runtime-config — kept for existing imports. */
export function getPublicAppOrigin(request?: Request): string {
  return resolvePublicAppOrigin(request);
}
