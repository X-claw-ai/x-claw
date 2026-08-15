"use client";

// PLACEHOLDER dashboard while KOKi migrates from Pump.fun (Solana) to
// Pons (Robinhood Chain). The real dashboard reads user-scoped launches
// from Supabase + the connected wallet's Pons launches. That work is
// tracked in P6 (monitor page + launches list) and P9 (schema swap).
//
// Rendering a friendly placeholder here is safer than pulling
// half-migrated state — the previous version used mintPubkey / Pump.fun
// URLs that no longer exist on Robinhood Chain.

import Link from "next/link";
import { useAccount } from "wagmi";
import { Rocket, Wrench } from "lucide-react";

export default function CommandCenter() {
  const { address, isConnected } = useAccount();

  return (
    <div className="space-y-10 pb-16">
      <section className="mx-auto max-w-6xl px-6">
        <div className="card !p-10 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-koki-500 text-ink-1000 mb-6">
            <Wrench className="h-6 w-6" />
          </div>
          <h2 className="text-display text-display-md">
            Dashboard is being rebuilt for <span className="stamp">Robinhood Chain</span>.
          </h2>
          <p className="mt-6 text-ink-300/80 text-base leading-relaxed font-medium max-w-2xl mx-auto">
            Your wallet-scoped launch history is moving from the
            Solana-era schema to a Pons-native schema. In the meantime
            the launch flow, monitor, and public /launches page continue
            to work.
          </p>
          {isConnected && address && (
            <p className="mt-4 text-[11px] font-mono text-ink-300/60">
              Connected: {address.slice(0, 6)}…{address.slice(-4)}
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/launch" className="btn btn-primary !py-3 !px-5">
              <Rocket className="h-4 w-4" />
              New launch
            </Link>
            <Link href="/launches" className="btn btn-secondary !py-3 !px-5">
              All launches
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
