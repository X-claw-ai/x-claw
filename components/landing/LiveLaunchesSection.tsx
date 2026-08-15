"use client";

import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";

// PLACEHOLDER live-launches section for the landing page. Once P6 lands
// the full Pons-indexed grid (live pool price, graduation progress, and
// Blockscout links pulled from lib/pons/indexer.ts + lib/pons/read.ts)
// takes over this file. Kept as a proper section so the home page still
// has the block below Hero and above the four-engine section.

export default function LiveLaunchesSection() {
  return (
    <section className="bg-bg border-b border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
        <div className="max-w-3xl">
          <div className="eyebrow flex items-center gap-2">
            <Rocket className="h-3 w-3" />
            Live launches
          </div>
          <h2 className="mt-3 text-display text-display-md text-balance">
            Migrating to <span className="stamp">Robinhood Chain</span>.
            <br />
            <span className="opacity-60">New launches ship shortly.</span>
          </h2>
          <p className="mt-6 text-ink-300/80 text-base md:text-lg leading-relaxed max-w-2xl font-medium">
            KOKi is moving the launch engine from Pump.fun on Solana to
            Pons on Robinhood Chain. The public launch board comes back
            online as soon as the indexer catches up to the current head.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/launches" className="btn btn-primary !py-3 !px-5">
              Open launch board
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://www.ponsfamily.com/launchpad"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary !py-3 !px-5"
            >
              Explore Pons
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
