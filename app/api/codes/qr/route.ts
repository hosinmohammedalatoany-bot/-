import QRCode from "qrcode";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data")?.trim();
  if (!data || data.length > 2048) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const size = Math.min(512, Math.max(64, Number(searchParams.get("size")) || 128));

  try {
    const buffer = await QRCode.toBuffer(data, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      type: "png"
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch {
    return NextResponse.json({ error: "QR generation failed" }, { status: 500 });
  }
}
