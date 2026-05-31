import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "Baraa Raed Car Showroom Management System",
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      api: "ok",
      database: "configure POSTGRES_URL in production",
      offlineQueue: "client IndexedDB enabled",
      ownership: "self-hosted, no SaaS subscription model"
    }
  });
}
