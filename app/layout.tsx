import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/shell/Navbar";
import Footer from "@/components/shell/Footer";
import { XClawWalletProvider } from "@/components/solana/WalletContext";

export const metadata: Metadata = {
  title: "X CLAW — The Grok-native Meme Coin Launch Agent",
  description:
    "X CLAW turns X attention, community momentum, and on-chain intelligence into autonomous launch execution. From meme idea to Pump.fun launch.",
  metadataBase: new URL("https://xclaw.local"),
  openGraph: {
    title: "X CLAW — The Grok-native Meme Coin Launch Agent",
    description:
      "From meme idea to Pump.fun launch. Attention · Community · Intelligence · Execution.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-zinc-100 antialiased">
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
