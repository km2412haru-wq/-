import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "世界史マップ — 国をタップして歴史を知る",
  description: "世界地図から国を選ぶと、その国の歴史をWikipediaから要約表示するアプリ",
  appleWebApp: {
    capable: true,
    title: "世界史マップ",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0891b2",
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
