import { NextResponse } from "next/server";
import { buildRuntimeConfig } from "@/lib/runtime-config";

export async function GET(request: Request) {
  const config = buildRuntimeConfig(request);
  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
