import type { MetadataRoute } from "next";

// Web app manifest. Next.js auto-emits this at /manifest.webmanifest
// and adds <link rel="manifest"> in <head>. Signals to browsers,
// search engines, and wallet reputation systems (MetaMask, Rainbow,
// Robinhood Wallet, Blowfish) that this is a real, intentional web app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HAMR.fun, Autonomous Meme Coin Launch Agent",
    short_name: "HAMR.fun",
    description:
      "Autonomous AI agent that detects X memes, generates launch kits, and ships tokens on Robinhood Chain in one signature.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0A0F",
    theme_color: "#8B5CF6",
    categories: ["finance", "productivity", "developer"],
    lang: "en",
    // Next.js auto-emits /icon (no extension) from app/icon.tsx, that's
    // the right URL to point the manifest at. /icon.png is a 404.
    icons: [
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
