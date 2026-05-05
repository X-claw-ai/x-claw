import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/shell/Navbar";
import Footer from "@/components/shell/Footer";
import { XClawWalletProvider } from "@/components/solana/WalletContext";

const TITLE = "KOKi.ai — The Grok-native Meme Coin Launch Agent";
const DESCRIPTION =
  "KOKi.ai detects real-time memes on X and turns them into autonomous Pump.fun launches. Detect → Analyze → Generate → Launch → Monitor.";

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
  themeColor: "#E55B14",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-koki-500">
      <body className="min-h-screen bg-koki-500 text-ink-1000 antialiased">
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
