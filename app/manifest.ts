import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baraa Raed Car Showroom Management System",
    short_name: "Baraa Raed",
    description: "Offline-first owned vehicle showroom ERP for web, mobile, PWA, and desktop.",
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
        purpose: "any maskable"
      }
    ]
  };
}
