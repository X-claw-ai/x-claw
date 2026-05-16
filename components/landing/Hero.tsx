"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { usePumpCoin, formatMcUsd } from "@/lib/hooks/usePumpCoin";

// Merged hero: brand pitch on the left, a live 4-card launch preview on the
// right. On mobile the two stacks vertically (pitch on top, cards below).
// Replaces the standalone LiveLaunchesSection at the top of the page so the
// visitor sees the pitch AND the social proof on the first screen.

interface PublicLaunch {
  mint_pubkey: string;
  ticker: string;
  token_name: string;
  metadata_uri: string | null;
  pump_url: string | null;
  wallet_pubkey: string;
  created_at: string;
}

const PREVIEW_COUNT = 4;

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-app border-b border-[var(--border)]">
      {/* Decorative giant paw watermark, orange glow on dark canvas */}
      <svg
        viewBox="0 0 32 32"
        className="absolute -right-32 -bottom-48 w-[720px] h-[720px] opacity-[0.05] pointer-events-none"
        aria-hidden
      >
        <ellipse cx="16" cy="22" rx="7.5" ry="6" fill="#E55B14" />
        <ellipse cx="6.5" cy="13" rx="2.6" ry="3.2" fill="#E55B14" />
        <ellipse cx="11.5" cy="8.5" rx="2.6" ry="3.2" fill="#E55B14" />
        <ellipse cx="20.5" cy="8.5" rx="2.6" ry="3.2" fill="#E55B14" />
        <ellipse cx="25.5" cy="13" rx="2.6" ry="3.2" fill="#E55B14" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-20 md:pt-24 md:pb-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16 items-start">
          {/* ── LEFT: pitch ───────────────────────────────────────────── */}
          <div className="min-w-0">
            <h1 className="text-display text-display-lg max-w-xl text-balance anim-up">
              Detect. Analyze.
              <br />
              <span className="stamp">Launch.</span> Repeat.
            </h1>

            <p className="mt-7 text-ink-300 text-xl md:text-2xl leading-snug max-w-xl font-bold text-balance">
              An autonomous AI agent that detects viral memes on{" "}
              <span className="text-koki-500">@X</span> and,{" "}
              <span className="text-koki-500">with one click</span>, creates
              everything from token concepts and launch kits to{" "}
              <span className="text-koki-500">Pump.fun launch</span>.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/launch" className="btn btn-primary !py-3 !px-5">
                Launch your meme
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className="btn btn-secondary !py-3 !px-5">
                See agent launches
              </Link>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold text-ink-300/72">
              <ShieldCheck className="h-3.5 w-3.5" />
              Solana mainnet, Phantom / Solflare, KOKi never holds your keys.
            </div>
          </div>

          {/* ── RIGHT: live launch preview ─────────────────────────────── */}
          <LaunchPreviewPanel />
        </div>
      </div>
    </section>
  );
}

/**
 * Compact 2x2 grid of the four freshest KOKi-shipped tokens, with the
 * same hover/lift treatment as the main /launches gallery. Self-hides
 * if the public board is empty (so we don't show empty placeholders
 * inside the hero).
 */
function LaunchPreviewPanel() {
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

  if (items !== null && items.length === 0) return null;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-ink-300/65">
          Real launches
        </div>
        <Link
          href="/launches"
          className="inline-flex items-center gap-1 text-[12px] font-extrabold text-ink-300/72 hover:text-koki-500"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {items === null ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((l, i) => (
            <PreviewCard key={l.mint_pubkey} launch={l} idx={i} />
          ))}
        </div>
      )}
    </div>
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
      .then((m: { image?: string } | null) => {
        if (cancelled || !m || !m.image) return;
        const url = m.image;
        setImgUrl(url);
        try {
          window.localStorage.setItem(cacheKey, url);
        } catch {
          /* ignore */
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
      style={{ animationDelay: `${Math.min(idx, 4) * 80}ms` }}
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
            <span className="text-ink-300 font-black text-[clamp(18px,3vw,32px)] tracking-tight">
              ${launch.ticker}
            </span>
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <div className="text-[13px] font-black tracking-tight truncate">
            {launch.token_name}
          </div>
          <span className="text-[10px] font-extrabold text-ink-300/65 shrink-0">
            ${launch.ticker}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-bold text-ink-300/55 uppercase tracking-wider">
            Mcap
          </span>
          <span className="text-[12px] font-black tabular-nums tracking-tight">
            {stats ? formatMcUsd(stats.marketCapUsd) : "-"}
          </span>
        </div>

        {stats && stats.bondingProgress !== null && (
          <div className="h-[4px] w-full rounded-full bg-ink-1000/40 overflow-hidden mt-1">
            <div
              className="h-full relative bg-koki-500 transition-all duration-500"
              style={{
                width: `${Math.max(0, Math.min(1, stats.bondingProgress)) * 100}%`,
              }}
            >
              {!stats.complete && (
                <span className="absolute inset-0 bonding-shimmer pointer-events-none" />
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-auto pt-1.5">
          <Badge
            tone={stats?.complete ? "live" : "neutral"}
            className="!h-[16px] !text-[8px] !px-1.5"
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
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card !p-0 overflow-hidden animate-pulse">
          <div className="aspect-square w-full bg-koki-500/40 border-b border-[var(--border-strong)]" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-ink-1000/30 rounded w-3/4" />
            <div className="h-2 bg-ink-1000/30 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
