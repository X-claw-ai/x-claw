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
      <div className="hidden sm:block [&_button.wallet-adapter-button]:!h-8 [&_button.wallet-adapter-button]:!text-[11px] [&_button.wallet-adapter-button]:!font-extrabold [&_button.wallet-adapter-button]:!px-3 [&_button.wallet-adapter-button]:!bg-cream-50 [&_button.wallet-adapter-button]:!text-ink-300 [&_button.wallet-adapter-button]:!border-[1.5px] [&_button.wallet-adapter-button]:!border-[var(--border-strong)] [&_button.wallet-adapter-button]:!rounded-[10px] [&_button.wallet-adapter-button]:hover:!bg-cream-100">
        <WalletMultiButton />
      </div>
    );
  }

  const addr = publicKey.toBase58();
  const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;

  return (
    <div className="hidden sm:inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-cream-50 px-3 py-1.5 text-[11px] font-extrabold text-ink-300">
      <Wallet className="h-3.5 w-3.5" />
      <span className="opacity-70">{wallet?.adapter?.name}</span>
      <span className="font-mono">{short}</span>
    </div>
  );
}
