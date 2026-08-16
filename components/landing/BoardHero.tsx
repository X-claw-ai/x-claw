"use client";

import Link from "next/link";
import { Rocket, Sparkles } from "lucide-react";

// Compact hero strip that sits above the token grid on /. Purposely
// tiny — one line of copy, two CTAs, no scroll-jumping marketing block.
// The token grid IS the product; visitors should land on it, not on a
// pitch. Pump.fun does the same thing.

export default function BoardHero() {
  return (
    <section className="border-b border-[var(--border)] bg-bg-elevated">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[15px] md:text-[17px] font-black tracking-tight text-ink-300 leading-tight">
            Ship a memecoin in one signature.
            <span className="ml-2 opacity-60 font-bold">
              Own launchpad on Robinhood Chain.
            </span>
          </div>
          <div className="mt-1 text-[11px] font-bold text-ink-300/60">
            HAMR agent scans X for the viral moment. You approve. Wallet signs. Done.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/launch?autopilot=1"
            className="btn btn-secondary !py-2 !px-3 !text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Auto-pilot
          </Link>
          <Link
            href="/launch"
            className="btn btn-primary !py-2 !px-3.5 !text-xs"
          >
            <Rocket className="h-3.5 w-3.5" />
            Launch a coin
          </Link>
        </div>
      </div>
    </section>
  );
}
