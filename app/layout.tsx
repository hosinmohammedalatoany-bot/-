import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "براء رائد | نظام إدارة معرض السيارات",
  description:
    "نظام عربي مملوك بالكامل لإدارة معرض السيارات والمبيعات والأقساط والمخزون والمحاسبة والطباعة والعمل بدون إنترنت.",
  applicationName: "براء رائد",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "براء رائد"
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
