"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Wallet } from "lucide-react";

// Tiny wallet status pill for the navbar. Shows the WalletMultiButton when
// disconnected; collapses to a short pubkey + wallet name when connected.
export default function WalletPill() {
  const { connected, publicKey, wallet } = useWallet();

  if (!connected || !publicKey) {
    return (
      <div className="hidden sm:block [&_button.wallet-adapter-button]:!h-8 [&_button.wallet-adapter-button]:!text-xs [&_button.wallet-adapter-button]:!px-3 [&_button.wallet-adapter-button]:!bg-transparent [&_button.wallet-adapter-button]:!border [&_button.wallet-adapter-button]:!border-white/10 [&_button.wallet-adapter-button]:hover:!border-claw-500/40">
        <WalletMultiButton />
      </div>
    );
  }

  const addr = publicKey.toBase58();
  const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;

  return (
    <div className="hidden sm:inline-flex items-center gap-2 rounded-md border border-claw-500/30 bg-claw-500/5 px-3 py-1.5 text-xs text-claw-300">
      <Wallet className="h-3.5 w-3.5" />
      <span className="text-zinc-400">{wallet?.adapter?.name}</span>
      <span className="font-mono text-zinc-200">{short}</span>
    </div>
  );
}
