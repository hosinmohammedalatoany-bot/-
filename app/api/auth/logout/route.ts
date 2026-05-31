import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", "br_session=; Path=/; HttpOnly; Max-Age=0");
  return response;
}
