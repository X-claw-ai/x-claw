import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/shell/Navbar";
import Footer from "@/components/shell/Footer";
import { XClawWalletProvider } from "@/components/solana/WalletContext";

export const metadata: Metadata = {
  title: "X CLAW — The Grok-native Meme Coin Launch Agent",
  description:
    "X CLAW detects real-time memes on X and turns them into autonomous Pump.fun launches. Detect → Analyze → Generate → Launch.",
  metadataBase: new URL("https://xclaw.local"),
  openGraph: {
    title: "X CLAW — The Grok-native Meme Coin Launch Agent",
    description:
      "Real-time X memes → autonomous token launches.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-ink-1000">
      <body className="min-h-screen bg-ink-1000 text-zinc-100 antialiased">
        <XClawWalletProvider>
          <div className="bg-app min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </XClawWalletProvider>
      </body>
    </html>
  );
}
