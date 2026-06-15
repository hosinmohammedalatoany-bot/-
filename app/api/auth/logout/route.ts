import { NextResponse } from "next/server";
import {
  clearAuthCookieHeaders,
  readJwtAccessFromCookie,
  readJwtRefreshFromCookie
} from "@/lib/server/jwt-session";
import { djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";
import { readDb, writeDb } from "@/lib/server/db";
import { resolveSessionToken } from "@/lib/server/session";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (isDjangoAuthEnabled()) {
    const access = readJwtAccessFromCookie(cookieHeader);
    const refresh = readJwtRefreshFromCookie(cookieHeader);
    if (access) {
      await djangoJson("/api/auth/logout/", {
        method: "POST",
        accessToken: access,
        body: JSON.stringify({ refresh: refresh ?? "" })
      });
    }
  } else {
    const token = await resolveSessionToken(cookieHeader);
    if (token) {
      const db = await readDb();
      db.sessions = db.sessions.filter((s) => s.token !== token);
      await writeDb(db);
    }
  }

  const response = NextResponse.json({ ok: true });
  for (const header of clearAuthCookieHeaders(request)) {
    response.headers.append("Set-Cookie", header);
  }
  return response;
}
