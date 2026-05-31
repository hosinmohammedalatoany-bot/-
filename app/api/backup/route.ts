import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { snapshot?: unknown; encrypted?: boolean };
    const payload = JSON.stringify(body.snapshot ?? {});
    const sizeBytes = new TextEncoder().encode(payload).length;

    return NextResponse.json({
      ok: true,
      sizeBytes,
      encrypted: Boolean(body.encrypted),
      createdAt: new Date().toISOString(),
      storage: "server-stub"
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Backup failed" }, { status: 500 });
  }
}
