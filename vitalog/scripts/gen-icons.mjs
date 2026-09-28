import { ImageResponse } from "next/og";
import { writeFile, mkdir } from "node:fs/promises";

async function gen(size, out, { radius = 0, glyphScale = 0.36 } = {}) {
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
          background: "#2f6feb",
          borderRadius: radius,
        },
        children: {
          type: "svg",
          props: {
            width: size * glyphScale * 3,
            height: size * glyphScale * 3,
            viewBox: "0 0 100 60",
            children: {
              type: "path",
              props: {
                d: "M4 34 H30 L40 10 L60 52 L70 34 H96",
                fill: "none",
                stroke: "#ffffff",
                strokeWidth: 8,
                strokeLinecap: "round",
                strokeLinejoin: "round",
              },
            },
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
  // 通常アイコン(角丸)
  await gen(192, "public/icons/icon-192.png", { radius: 36 });
  await gen(512, "public/icons/icon-512.png", { radius: 96 });
  // maskableアイコン(Android用。OS側でマスクされるため角丸なし、グリフを中央寄せ)
  await gen(192, "public/icons/icon-maskable-192.png", { radius: 0, glyphScale: 0.28 });
  await gen(512, "public/icons/icon-maskable-512.png", { radius: 0, glyphScale: 0.28 });
}

main();
