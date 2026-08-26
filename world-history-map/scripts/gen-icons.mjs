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
          background: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)",
          borderRadius: radius,
        },
        children: {
          type: "div",
          props: {
            style: { fontSize: fontSize ?? size * 0.5, fontWeight: 700, color: "#fff", fontFamily: "sans-serif" },
            children: "史",
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
  // inside the safe zone, no rounding of our own since the OS applies its
  // own mask shape.
  await gen(192, "public/icons/icon-maskable-192.png", { radius: 0, fontSize: 192 * 0.38 });
  await gen(512, "public/icons/icon-maskable-512.png", { radius: 0, fontSize: 512 * 0.38 });
}

main();
