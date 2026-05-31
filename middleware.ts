import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/setup", "/forgot-password", "/reset-password", "/api/auth", "/api/health", "/api/sync", "/offline"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webmanifest");

  if (isPublic || isStatic) {
    return NextResponse.next();
  }

  const session = request.cookies.get("br_session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
