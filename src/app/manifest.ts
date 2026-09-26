import type { MetadataRoute } from "next";

// Makes "Add to Home Screen" produce a real app: the whole site is in scope,
// so navigating anywhere stays inside the app instead of popping open Safari.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sideline",
    short_name: "Sideline",
    description: "Your backyard league, run like the pros.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0c10",
    theme_color: "#0a0c10",
    icons: [
      { src: "/app-icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
