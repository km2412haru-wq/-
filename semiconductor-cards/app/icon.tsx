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
          background: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            fontSize: 260,
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
