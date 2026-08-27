import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "半導体トレカ図鑑 — 企業のビジネスモデルと競合を感覚でつかむ",
  description:
    "TSMC・NVIDIA・東京エレクトロンなど半導体業界の主要企業をトレーディングカード感覚で見比べ、ビジネスモデルや競合関係を直感的に理解できる図鑑アプリ",
  appleWebApp: {
    capable: true,
    title: "半導体トレカ図鑑",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
