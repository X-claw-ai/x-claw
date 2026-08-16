import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/shell/Navbar";
import Footer from "@/components/shell/Footer";
import { KokiWalletProvider } from "@/components/evm/WalletContext";

const TITLE = "HAMR.fun, The Autonomous Meme Coin Launch Agent";
const DESCRIPTION =
  "An autonomous AI agent that detects viral memes on @X and, with one click, creates everything from token concepts and launch kits to a live launch on Robinhood Chain.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL("https://hamr.fun"),
  applicationName: "HAMR.fun",
  authors: [{ name: "HAMR.fun contributors" }],
  generator: "Next.js",
  keywords: [
    "Robinhood Chain",
    "launchpad",
    "memecoin",
    "xAI",
    "AI agent",
    "launch agent",
    "X native",
    "open source",
  ],
  category: "finance",
  alternates: {
    canonical: "https://hamr.fun",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "https://hamr.fun",
    siteName: "HAMR.fun",
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
  // blends into the app. Pure white now that the site is a monochrome
  // light theme.
  themeColor: "#0A0A0F",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-bg">
      <body className="min-h-screen bg-bg text-ink-300 antialiased bg-app">
        <KokiWalletProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </KokiWalletProvider>
      </body>
    </html>
  );
}
