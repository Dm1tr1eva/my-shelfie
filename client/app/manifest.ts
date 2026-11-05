import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "my-shelfie",
    short_name: "my-shelfie",
    description: "A home library and a wishlist for people who collect books in series.",
    start_url: "/library",
    scope: "/",
    display: "standalone",
    background_color: "#ece4e5",
    theme_color: "#192b51",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
