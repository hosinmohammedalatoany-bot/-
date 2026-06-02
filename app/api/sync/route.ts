import { NextRequest, NextResponse } from "next/server";
import { appendAuditLog, readDb, writeDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/api-auth";
import { dedupeOperations, syncOperationKey } from "@/lib/sync-idempotency";

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

const MAX_SYNC_RECEIPTS = 3000;

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) {
    return auth.response;
  }

  const body = (await request.json()) as SyncRequest;
  const operations = dedupeOperations(body.operations ?? []);
  const deviceId = body.deviceId ?? "unregistered-device";
  const db = await readDb();
  const receiptKeys = new Set((db.syncReceipts ?? []).map((row) => row.key));

  const acceptedIds: string[] = [];
  const duplicateIds: string[] = [];
  const newReceipts = [...(db.syncReceipts ?? [])];

  for (const op of operations) {
    const key = syncOperationKey(deviceId, op.operation, op.entityId, op.id);
    if (receiptKeys.has(key)) {
      duplicateIds.push(op.id);
      continue;
    }
    receiptKeys.add(key);
    acceptedIds.push(op.id);
    newReceipts.unshift({ key, at: new Date().toISOString() });
  }

  db.syncReceipts = newReceipts.slice(0, MAX_SYNC_RECEIPTS);

  await appendAuditLog(db, {
    action: "sync.push",
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    details: `مزامنة من ${deviceId} — مقبول ${acceptedIds.length}، مكرر ${duplicateIds.length}`
  });
  await writeDb(db);

  return NextResponse.json({
    accepted: acceptedIds.length,
    rejected: operations.length - acceptedIds.length - duplicateIds.length,
    acceptedIds,
    duplicateIds,
    conflicts: [],
    serverTime: new Date().toISOString(),
    deviceId,
    strategy: "idempotent-by-device-and-operation-id",
    note:
      acceptedIds.length > 0
        ? "تم قبول العمليات الجديدة وتسجيلها."
        : duplicateIds.length > 0
          ? "جميع العمليات كانت مكررة — لم يُعاد تنفيذها."
          : "لا توجد عمليات في الطابور."
  });
}
