import type { MetadataRoute } from "next";

// Web app manifest. Next.js auto-emits this at /manifest.webmanifest
// and adds <link rel="manifest"> in <head>. Signals to browsers,
// search engines, and Phantom/Blowfish reputation systems that this
// is a real, intentional web app — not a phishing throwaway.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KOKi.ai — Grok-native Meme Coin Launch Agent",
    short_name: "KOKi.ai",
    description:
      "Grok-native AI agent that detects X memes, generates launch kits, and ships tokens to Pump.fun in one signature.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#E55B14",
    theme_color: "#E55B14",
    categories: ["finance", "productivity", "developer"],
    lang: "en",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
