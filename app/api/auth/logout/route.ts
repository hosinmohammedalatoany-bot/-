import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/server/db";
import { parseSessionToken } from "@/lib/server/session";

export async function POST(request: Request) {
  const token = parseSessionToken(request.headers.get("cookie"));
  if (token) {
    const db = await readDb();
    db.sessions = db.sessions.filter((s) => s.token !== token);
    await writeDb(db);
  }
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", "br_session=; Path=/; HttpOnly; Max-Age=0");
  return response;
}
