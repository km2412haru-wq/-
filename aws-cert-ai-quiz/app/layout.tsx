import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWS認定AI作問クイズ",
  description:
    "AWS認定資格(Cloud Practitioner / Solutions Architect Associate)対策。AIが公式試験ガイドに基づきその都度オリジナル問題を生成する学習ツール",
};

export const viewport: Viewport = {
  themeColor: "#e8830b",
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
