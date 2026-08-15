"use client";

// PLACEHOLDER token monitor. The full Pons-native monitor lands in P6 —
// it uses readTokenMeta / readGraduation / readPriceInWeth from
// lib/pons/read.ts to render live pool price, graduation progress, and
// creator payout state pulled from the Pons locker.
//
// The route params still deliver whatever address slug was passed
// (previously a Solana mint pubkey, now an EVM 0x… address). We surface
// it verbatim + a Blockscout link so bookmarks stay useful during the
// migration window.

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { explorerUrl } from "@/lib/robinhood/chain";

export default function LaunchMonitorPage({ token }: { token: string }) {
  const isEvmAddr = /^0x[0-9a-fA-F]{40}$/.test(token);
  const href = isEvmAddr ? explorerUrl("token", token) : undefined;

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <div className="card !p-10">
        <div className="eyebrow flex items-center gap-2">
          <span>Pons launch monitor</span>
        </div>
        <h1 className="mt-3 text-display text-display-md text-balance">
          Monitor is being rebuilt for <span className="stamp">Robinhood Chain</span>.
        </h1>
        <p className="mt-5 text-ink-300/80 text-base leading-relaxed font-medium">
          Live pool price, graduation progress, holder breakdown, and
          creator payout state all move to Pons factory + locker reads.
          The token you asked about:
        </p>
        <p className="mt-4 font-mono text-[13px] text-ink-300 break-all">
          {token}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary !py-3 !px-5"
            >
              Open on Blockscout
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="text-[12px] text-ink-300/60 font-bold">
              Address doesn&apos;t look like a Robinhood Chain token yet.
            </span>
          )}
          <Link href="/launches" className="btn btn-secondary !py-3 !px-5">
            All launches
          </Link>
        </div>
      </div>
    </section>
  );
}
