import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import RecoveryNoticeBanner from "@/components/RecoveryNoticeBanner";

export const metadata: Metadata = {
  title: "Vitalog",
  description: "成人スティル病(AOSD)当事者本人のための体調・服薬・生活負荷トラッキングPWA",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
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
      <body>
        <ServiceWorkerRegister />
        <RecoveryNoticeBanner />
        {children}
      </body>
    </html>
  );
}
