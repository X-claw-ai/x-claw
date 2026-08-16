"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";

// Tiny wallet status pill for the navbar.
//
// Wraps RainbowKit's ConnectButton.Custom so we can render the same
// pill shape whether the wallet is disconnected, connected, or on a
// wrong chain. This gives us a consistent 32–36px tall element that
// matches the X / GitHub icons and the "Launch ↗" CTA next to it.
export default function WalletPill() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openConnectModal,
        openChainModal,
        openAccountModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        if (!ready) {
          // Match the pill shape while hydrating so the navbar doesn't
          // shift horizontally when the wallet button pops in.
          return (
            <div
              aria-hidden="true"
              className="h-8 w-[128px] rounded-[10px] border border-[var(--border)] bg-cream-50/60 animate-pulse"
            />
          );
        }

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-cream-50 px-2.5 sm:px-3 h-8 text-[11px] font-extrabold text-ink-300 hover:bg-cream-100 transition-colors"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-red-500/60 bg-red-500/10 px-2.5 sm:px-3 h-8 text-[11px] font-extrabold text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Wrong network</span>
              <span className="sm:hidden">Wrong net</span>
            </button>
          );
        }

        const addr = account.address;
        const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;

        return (
          <button
            type="button"
            onClick={openAccountModal}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-cream-50 px-2.5 sm:px-3 h-8 text-[11px] font-extrabold text-ink-300 hover:bg-cream-100 transition-colors"
          >
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline opacity-70">
              {account.displayName?.split(".")[0] ?? "Wallet"}
            </span>
            <span className="font-mono">{short}</span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
