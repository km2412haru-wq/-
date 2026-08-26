import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "AI M&A Radar — AI企業のM&A・ビジネス動向トラッカー",
  description:
    "AI関連企業のM&A、ビジネスモデル、業績・利益動向をRSSから集約して表示するダッシュボード",
  appleWebApp: {
    capable: true,
    title: "AI M&A Radar",
    statusBarStyle: "default",
  },
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
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
