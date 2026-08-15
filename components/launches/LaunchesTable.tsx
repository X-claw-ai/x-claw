"use client";

// PLACEHOLDER launches table for the Robinhood Chain / Pons era.
// The Solana-era table read from a `launches` Supabase schema keyed by
// mintPubkey + pumpUrl. Those columns are being replaced by an EVM
// schema (token address + Blockscout URL + Pons page). Once P9 lands
// this file becomes a proper Pons launches table sourced from
// lib/pons/indexer.ts.

import Link from "next/link";
import { Rocket } from "lucide-react";

export default function LaunchesTable() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="card !p-10 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-koki-500 text-ink-1000 mb-5">
          <Rocket className="h-5 w-5" />
        </div>
        <h2 className="text-display text-display-md">
          Launches list is being rebuilt for <span className="stamp">Pons</span>.
        </h2>
        <p className="mt-6 text-ink-300/80 text-base leading-relaxed font-medium max-w-xl mx-auto">
          KOKi is indexing Pons `TokenLaunched` events on Robinhood Chain
          directly from the factory contract. As soon as the indexer job
          catches up the full table returns, with live pool price,
          graduation progress, and Blockscout links.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/launch" className="btn btn-primary !py-3 !px-5">
            Ship a new launch
          </Link>
          <a
            href="https://robinhoodchain.blockscout.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary !py-3 !px-5"
          >
            Robinhood Blockscout
          </a>
        </div>
      </div>
    </section>
  );
}
