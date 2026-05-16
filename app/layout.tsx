import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/shell/Navbar";
import Footer from "@/components/shell/Footer";
import { XClawWalletProvider } from "@/components/solana/WalletContext";

const TITLE = "KOKi.ai, The Grok-native Meme Coin Launch Agent";
const DESCRIPTION =
  "An autonomous AI agent that detects viral memes on @X and, with one click, creates everything from token concepts and launch kits to Pump.fun launch.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL("https://kokiai.app"),
  applicationName: "KOKi.ai",
  authors: [{ name: "KOKi.ai contributors" }],
  generator: "Next.js",
  keywords: [
    "Solana",
    "Pump.fun",
    "memecoin",
    "Grok",
    "xAI",
    "AI agent",
    "launch agent",
    "X-native",
    "open source",
  ],
  category: "finance",
  alternates: {
    canonical: "https://kokiai.app",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "https://kokiai.app",
    siteName: "KOKi.ai",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  // Match the page background so the URL bar / status bar on mobile
  // blends into the app. Was the brand orange when the site was
  // orange-on-cream; now it's the deep dark canvas.
  themeColor: "#0B0E11",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-bg">
      <body className="min-h-screen bg-bg text-ink-300 antialiased bg-app">
        <XClawWalletProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </XClawWalletProvider>
      </body>
    </html>
  );
}
