import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0a0a0a 0%, #1a2744 55%, #070707 100%)",
          borderRadius: 36,
          border: "4px solid #d6a84f"
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: "#f3c96b",
            letterSpacing: 4
          }}
        >
          BR
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: 6
          }}
        >
          ERP
        </div>
      </div>
    ),
    { ...size }
  );
}
