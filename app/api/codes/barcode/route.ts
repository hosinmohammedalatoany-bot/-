import bwipjs from "bwip-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data")?.trim();
  if (!data || data.length > 80) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const height = Math.min(120, Math.max(24, Number(searchParams.get("height")) || 56));

  try {
    const buffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: data,
      scale: 2,
      height: Math.max(8, Math.round(height / 6)),
      includetext: true,
      textxalign: "center"
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch {
    return NextResponse.json({ error: "Barcode generation failed" }, { status: 500 });
  }
}
