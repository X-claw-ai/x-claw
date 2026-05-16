"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { usePumpCoin, formatMcUsd } from "@/lib/hooks/usePumpCoin";

// Landing-page social proof: a live preview of the public 'All Launches'
// board. Shows the freshest 8 KOKi-shipped tokens with image, ticker,
// market cap, and bonding-curve progress straight from Pump.fun. The CTA
// links to /launches for the full board.
//
// Pulls from the same /api/launches (no wallet param) endpoint the
// /launches page uses. Capped at 8 cards on the home view so the section
// stays light and the page-load story isn't dominated by API hops.

interface PublicLaunch {
  mint_pubkey: string;
  ticker: string;
  token_name: string;
  metadata_uri: string | null;
  pump_url: string | null;
  wallet_pubkey: string;
  created_at: string;
}

const PREVIEW_COUNT = 8;

export default function LiveLaunchesSection() {
  const [items, setItems] = useState<PublicLaunch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/launches", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { ok: boolean; launches?: PublicLaunch[] } | null) => {
        if (cancelled || !json || !json.ok) return;
        setItems((json.launches ?? []).slice(0, PREVIEW_COUNT));
      })
      .catch(() => setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide the section entirely when there's nothing to show. The landing
  // page shouldn't tease an empty board, it's better to skip the section
  // than to render a "no launches yet" tile that signals dead product.
  if (items !== null && items.length === 0) return null;

  return (
    <section className="bg-bg border-b border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
        <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
          <div>
            <div className="eyebrow !text-[10px] mb-2">
              Live · KOKi-shipped tokens
            </div>
            <h2 className="text-display text-display-md text-balance">
              Real launches.
              <br />
              <span className="opacity-60">Real wallets. Real markets.</span>
            </h2>
            <p className="mt-4 text-ink-300/80 text-base md:text-lg leading-snug max-w-xl font-medium">
              Every memecoin shipped through the KOKi agent, across all
              wallets, with live market cap and bonding-curve progress
              straight from Pump.fun.
            </p>
          </div>
          <Link
            href="/launches"
            className="btn btn-secondary !py-3 !px-5 whitespace-nowrap"
          >
            See all launches
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {items === null ? (
          <SkeletonGrid />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((l, i) => (
              <PreviewCard key={l.mint_pubkey} launch={l} idx={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PreviewCard({ launch, idx }: { launch: PublicLaunch; idx: number }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const stats = usePumpCoin(launch.mint_pubkey);

  useEffect(() => {
    if (!launch.metadata_uri) return;
    const cacheKey = `koki:img:${launch.mint_pubkey}`;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        setImgUrl(cached);
        return;
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;
    fetch(launch.metadata_uri, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((meta) => {
        if (cancelled) return;
        const url = meta && typeof meta.image === "string" ? meta.image : null;
        if (url) {
          setImgUrl(url);
          try {
            window.localStorage.setItem(cacheKey, url);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [launch.metadata_uri, launch.mint_pubkey]);

  return (
    <Link
      href={`/launches/${launch.mint_pubkey}`}
      className="card card-hover group flex flex-col overflow-hidden !p-0 launch-card-anim"
      style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
    >
      <div className="aspect-square w-full bg-koki-500 overflow-hidden relative border-b border-[var(--border-strong)]">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt={launch.token_name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
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

        <div className="flex items-baseline justify-between gap-2 pt-1">
          <span className="text-[10px] font-bold text-ink-300/55 uppercase tracking-wider">
            Mcap
          </span>
          <span className="text-[13px] font-black tabular-nums tracking-tight">
            {stats ? formatMcUsd(stats.marketCapUsd) : "-"}
          </span>
        </div>
        {stats && stats.bondingProgress !== null && (
          <div className="space-y-1 pt-1">
            <div className="flex items-baseline justify-between text-[9px] font-bold text-ink-300/55 uppercase tracking-wider">
              <span>Bonding</span>
              <span className="tabular-nums">
                {(Math.max(0, Math.min(1, stats.bondingProgress)) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-[5px] w-full rounded-full bg-ink-1000/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  stats.complete
                    ? "bg-ink-1000"
                    : "bg-koki-500 border-r border-[var(--border-strong)]"
                }`}
                style={{
                  width: `${Math.max(0, Math.min(1, stats.bondingProgress)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <Badge
            tone={stats?.complete ? "live" : "neutral"}
            className="!h-[18px] !text-[9px] !px-2"
          >
            {stats?.complete ? "Graduated" : "Launched"}
          </Badge>
          {launch.pump_url && (
            <a
              href={launch.pump_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-extrabold text-ink-300/72 hover:text-ink-300 hover:underline"
            >
              Pump <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card !p-0 overflow-hidden animate-pulse">
          <div className="aspect-square w-full bg-koki-500/40 border-b border-[var(--border-strong)]" />
          <div className="p-3.5 space-y-2">
            <div className="h-3.5 bg-ink-1000/10 rounded w-3/4" />
            <div className="h-2.5 bg-ink-1000/10 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
