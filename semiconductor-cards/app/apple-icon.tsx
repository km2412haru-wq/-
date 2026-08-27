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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
        }}
      >
        <div
          style={{
            fontSize: 92,
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: "sans-serif",
          }}
        >
          Si
        </div>
      </div>
    ),
    { ...size }
  );
}
