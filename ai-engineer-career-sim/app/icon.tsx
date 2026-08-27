import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)",
          borderRadius: 96,
        }}
      >
        <div style={{ fontSize: 300, fontFamily: "sans-serif" }}>🌱</div>
      </div>
    ),
    { ...size }
  );
}
