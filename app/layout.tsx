import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI M&A Radar — AI企業のM&A・ビジネス動向トラッカー",
  description:
    "AI関連企業のM&A、ビジネスモデル、業績・利益動向をRSSから集約して表示するダッシュボード",
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
