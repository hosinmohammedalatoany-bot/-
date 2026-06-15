import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionCookieValue } from "@/lib/server/session-signature";

const publicPaths = [
  "/login",
  "/register",
  "/setup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify",
  "/showroom",
  "/api/auth",
  "/api/health",
  "/api/public",
  "/api/runtime-config",
  "/offline",
  "/manifest.webmanifest",
  "/sw.js"
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webmanifest") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico");

  if (isPublic || isStatic) {
    return NextResponse.next();
  }

  const sessionRaw = request.cookies.get("br_session")?.value;
  const verified = await verifySessionCookieValue(sessionRaw);
  if (!verified) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
