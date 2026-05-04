import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/shell/Navbar";
import Footer from "@/components/shell/Footer";
import { XClawWalletProvider } from "@/components/solana/WalletContext";

export const metadata: Metadata = {
  title: "KOKi.ai — The Grok-native Meme Coin Launch Agent",
  description:
    "KOKi.ai detects real-time memes on X and turns them into autonomous Pump.fun launches. Detect → Analyze → Generate → Launch → Monitor.",
  metadataBase: new URL("https://koki.ai"),
  openGraph: {
    title: "KOKi.ai — The Grok-native Meme Coin Launch Agent",
    description:
      "Real-time X memes → autonomous Pump.fun launches.",
    type: "website",
  },
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
