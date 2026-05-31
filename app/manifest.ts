import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baraa Raed لإدارة معارض السيارات",
    short_name: "Baraa Raed",
    description: "نظام عربي مملوك بالكامل لإدارة معارض السيارات مع دعم العمل بدون إنترنت.",
    start_url: "/",
    display: "standalone",
    background_color: "#070707",
    theme_color: "#070707",
    orientation: "any",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/brand/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
