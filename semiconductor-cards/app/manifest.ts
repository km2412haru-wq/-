import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "半導体トレカ図鑑",
    short_name: "半導体トレカ",
    description:
      "半導体業界の主要企業をトレーディングカード感覚で見比べ、ビジネスモデルや競合関係を直感的に理解できる図鑑アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0e12",
    theme_color: "#f97316",
    lang: "ja",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
