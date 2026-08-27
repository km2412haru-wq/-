import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "駆け出しAIエンジニア物語 — キャリアシミュレーター",
  description:
    "シード期スタートアップから始まるAIエンジニアのキャリアを疑似体験するインタラクティブ・シミュレーションゲーム",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
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
      <body>{children}</body>
    </html>
  );
}
