"use client";

// PLACEHOLDER — the KOKi launch wizard is mid-migration from
// Pump.fun (Solana) to Pons (Robinhood Chain). The full Pons-native
// wizard lands in task P5, using the wallet stack + read/write
// helpers from lib/pons/*. Until then this stub keeps `/launch`
// routing green so the rest of the app builds cleanly.
//
// See:
//   - lib/pons/*        Pons contract client (read + write)
//   - lib/robinhood/*   Chain + RPC config
//   - components/evm/*  Wallet provider (wagmi + RainbowKit)

import Link from "next/link";
import { Wrench, Rocket } from "lucide-react";

export default function PumpLaunchWizard() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <div className="card !p-10 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-koki-500 text-ink-1000 mb-6">
          <Wrench className="h-6 w-6" />
        </div>
        <h1 className="text-display text-display-md">
          Launch wizard is being rebuilt for{" "}
          <span className="stamp">Pons</span>.
        </h1>
        <p className="mt-6 text-ink-300/80 text-base leading-relaxed font-medium max-w-xl mx-auto">
          KOKi is migrating from Pump.fun on Solana to Pons on Robinhood
          Chain. The one-signature launch flow is being rewired end-to-end
          to sign against the Pons factory instead of Pump.fun. Watch
          this page — the wizard comes back online in the next release.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/launches" className="btn btn-primary !py-3 !px-5">
            <Rocket className="h-4 w-4" />
            See past launches
          </Link>
          <a
            href="https://docs.ponsfamily.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary !py-3 !px-5"
          >
            Read the Pons docs
          </a>
        </div>
      </div>
    </section>
  );
}
