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
          // iOS applies its own rounded-square mask, so this fills edge-to-edge.
          background: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)",
        }}
      >
        <div
          style={{
            fontSize: 96,
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
