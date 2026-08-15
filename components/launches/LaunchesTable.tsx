"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Rocket } from "lucide-react";

// Public /launches board. Reads from /api/launches which now returns
// EVM-shaped rows out of pons_launches. Empty state pitches the launch
// flow instead of pretending it's temporarily unavailable.

interface PublicLaunch {
  token_address: string;
  pool_address: string | null;
  ticker: string;
  token_name: string;
  logo_url: string | null;
  wallet_address: string;
  created_at: string;
  pons_url: string | null;
  explorer_url: string | null;
}

export default function LaunchesTable() {
  const [items, setItems] = useState<PublicLaunch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/launches", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { ok?: boolean; launches?: PublicLaunch[] } | null) => {
        if (cancelled || !json || !json.ok) return;
        setItems(json.launches ?? []);
      })
      .catch(() => setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card !p-0 overflow-hidden animate-pulse">
              <div className="aspect-square w-full bg-koki-500/40 border-b border-[var(--border-strong)]" />
              <div className="p-3.5 space-y-2">
                <div className="h-3.5 bg-ink-1000/10 rounded w-3/4" />
                <div className="h-2.5 bg-ink-1000/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="card !p-10 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-koki-500 text-ink-1000 mb-5">
            <Rocket className="h-5 w-5" />
          </div>
          <h2 className="text-display text-display-md">
            No launches yet. <span className="stamp">Be the first.</span>
          </h2>
          <p className="mt-6 text-ink-300/80 text-base leading-relaxed font-medium max-w-xl mx-auto">
            Every token the HAMR agent ships lands here in real time —
            with live pool price, graduation progress, and Blockscout links.
            Run Auto-pilot or bring your own idea to seed the board.
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

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((l, i) => (
          <LaunchCard key={l.token_address} launch={l} idx={i} />
        ))}
      </div>
    </section>
  );
}

function LaunchCard({ launch, idx }: { launch: PublicLaunch; idx: number }) {
  return (
    <Link
      href={`/launches/${launch.token_address}`}
      className="card card-hover group flex flex-col overflow-hidden !p-0 launch-card-anim"
      style={{ animationDelay: `${Math.min(idx, 12) * 60}ms` }}
    >
      <div className="aspect-square w-full bg-koki-500 overflow-hidden relative border-b border-[var(--border-strong)]">
        {launch.logo_url ? (
          <Image
            src={launch.logo_url}
            alt={launch.token_name}
            fill
            sizes="200px"
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-ink-300 font-black text-[clamp(20px,4vw,40px)] tracking-tight">
              ${launch.ticker}
            </span>
          </div>
        )}
      </div>

      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <div className="text-[14px] font-black tracking-tight truncate">
            {launch.token_name}
          </div>
          <span className="text-[10px] font-extrabold text-ink-300/65 shrink-0">
            ${launch.ticker}
          </span>
        </div>
        <div className="text-[10px] text-ink-300/55 font-mono truncate">
          {launch.token_address.slice(0, 6)}…{launch.token_address.slice(-4)}
        </div>
        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <span className="text-[10px] text-ink-300/55 font-bold">
            {new Date(launch.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          {launch.pons_url && (
            <a
              href={launch.pons_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-extrabold text-ink-300/72 hover:text-ink-300 hover:underline"
            >
              Pons <ArrowUpRight className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}
