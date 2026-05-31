"use client";

/**
 * Origin mismatch banners removed — tunnel and production use resolvePublicAppOrigin /
 * resolveClientAppOrigin silently. Kept as no-op for imports that may still reference it.
 */
export function RuntimeOriginGuard() {
  return null;
}
