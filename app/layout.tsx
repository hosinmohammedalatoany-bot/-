import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { RuntimeOriginGuard } from "@/components/runtime-origin-guard";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baraa Raed | Car Showroom Management System",
  description:
    "Owned, offline-first car showroom ERP for vehicle sales, installments, inventory, accounting, printing, and branch operations.",
  applicationName: "Baraa Raed",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Baraa Raed"
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
      <body className="rtl-support antialiased">
        <PwaRegister />
        <RuntimeOriginGuard />
        {children}
      </body>
    </html>
  );
}
