import { ImageResponse } from "next/og";
import { writeFile, mkdir } from "node:fs/promises";

async function gen(size, out, { radius = 0, fontSize } = {}) {
  const res = new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%)",
          borderRadius: radius,
        },
        children: {
          type: "div",
          props: {
            style: { fontSize: fontSize ?? size * 0.55, fontWeight: 700, color: "#fff", fontFamily: "sans-serif" },
            children: "M",
          },
        },
      },
    },
    { width: size, height: size }
  );
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(out, buf);
  console.log("wrote", out, buf.length, "bytes");
}

async function main() {
  await mkdir("public/icons", { recursive: true });
  // Regular (browser) icons — slight rounding.
  await gen(192, "public/icons/icon-192.png", { radius: 36 });
  await gen(512, "public/icons/icon-512.png", { radius: 96 });
  // Maskable icons for Android adaptive-icon masking: keep the glyph well
  // inside the safe zone (roughly the center 80%), no rounding of our own
  // since the OS applies its own mask shape.
  await gen(192, "public/icons/icon-maskable-192.png", { radius: 0, fontSize: 192 * 0.42 });
  await gen(512, "public/icons/icon-maskable-512.png", { radius: 0, fontSize: 512 * 0.42 });
}

main();
