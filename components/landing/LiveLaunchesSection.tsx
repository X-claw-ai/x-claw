"use client";

import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";

// Landing "Live launches" band. Once the Pons indexer populates
// public.pons_launches with real rows the tile grid slots in below the
// header — until then, the section pitches the launch board without
// pretending it's already busy.

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
            Real launches.
            <br />
            <span className="opacity-60">Real wallets. Real markets.</span>
          </h2>
          <p className="mt-6 text-ink-300/80 text-base md:text-lg leading-relaxed max-w-2xl font-medium">
            Every memecoin shipped through the HAMR agent, indexed straight
            off the Pons factory on Robinhood Chain — with live pool price,
            graduation progress, and Blockscout links.
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
