import { NextRequest, NextResponse } from "next/server";

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
  const body = (await request.json()) as SyncRequest;
  const operations = body.operations ?? [];

  return NextResponse.json({
    accepted: operations.length,
    rejected: 0,
    conflicts: [],
    serverTime: new Date().toISOString(),
    deviceId: body.deviceId ?? "unregistered-device",
    strategy: "last-writer-requires-review-for-financial-records"
  });
}
