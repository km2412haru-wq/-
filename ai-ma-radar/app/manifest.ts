import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI M&A Radar",
    short_name: "AI M&A Radar",
    description:
      "AI関連企業のM&A・ビジネスモデル・業績動向をRSSから自動収集するダッシュボード",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f9",
    theme_color: "#4f46e5",
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
