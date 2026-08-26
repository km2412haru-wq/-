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
          background: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            fontSize: 280,
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: "sans-serif",
          }}
        >
          史
        </div>
      </div>
    ),
    { ...size }
  );
}
