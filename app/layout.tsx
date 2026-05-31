import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "باور | نظام إدارة معارض السيارات",
  description:
    "باور نظام عربي مملوك بالكامل لإدارة معارض السيارات والمبيعات والتقسيط والمخزون والمحاسبة والعمل بدون إنترنت.",
  applicationName: "باور",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "باور"
  },
  icons: {
    icon: "/brand/app-icon.svg",
    apple: "/brand/app-icon.svg"
  },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#070707",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
