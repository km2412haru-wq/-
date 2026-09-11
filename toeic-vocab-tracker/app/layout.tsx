import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知らない単語記録アプリ",
  description:
    "TOEIC学習用の単語記録アプリ。単語を登録するとAI(Claude)が派生語を提案し、単語グループとして管理できる",
};

export const viewport: Viewport = {
  themeColor: "#2f6feb",
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
