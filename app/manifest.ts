import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "baraa raed لإدارة معارض السيارات",
    short_name: "baraa raed",
    description: "نظام إدارة معارض السيارات — مبيعات، فواتير، تقسيط، طباعة، ومزامنة.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#070707",
    theme_color: "#070707",
    orientation: "any",
    dir: "rtl",
    lang: "ar",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/brand/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/brand/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      },
      {
        src: "/brand/logo-horizontal.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
