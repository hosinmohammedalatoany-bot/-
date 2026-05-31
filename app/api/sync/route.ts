import { NextRequest, NextResponse } from "next/server";
import { appendAuditLog, readDb, writeDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/api-auth";

interface SyncRequest {
  deviceId?: string;
  operations?: Array<{
    id: string;
    operation: string;
    entityId: string;
    payload: unknown;
    createdAt: string;
  }>;
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) {
    return auth.response;
  }

  const body = (await request.json()) as SyncRequest;
  const operations = body.operations ?? [];
  const db = await readDb();

  await appendAuditLog(db, {
    action: "sync.push",
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    details: `مزامنة من الجهاز ${body.deviceId ?? "غير معروف"} — ${operations.length} عملية`
  });
  await writeDb(db);

  return NextResponse.json({
    accepted: operations.length,
    rejected: 0,
    conflicts: [],
    serverTime: new Date().toISOString(),
    deviceId: body.deviceId ?? "unregistered-device",
    strategy: "last-writer-requires-review-for-financial-records",
    note: "المزامنة الكاملة مع قاعدة البيانات قيد التطوير؛ تم قبول الطابور وتسجيله في سجل التدقيق."
  });
}
