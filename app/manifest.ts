import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "براء رائد لإدارة معرض السيارات",
    short_name: "براء رائد",
    description: "نظام عربي مملوك بالكامل لإدارة معرض السيارات مع دعم العمل بدون إنترنت.",
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
