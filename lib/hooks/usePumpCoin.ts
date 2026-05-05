"use client";

import { useEffect, useState } from "react";

// Lightweight client hook that pulls live Pump.fun stats for a mint
// (market cap, bonding-curve progress, holders) via our /api/pump-coin
// proxy. Used by both the My-Launches and All-Launches gallery cards.
//
// - Lazy: only fetches once per mounted card.
// - Cached: results are cached in sessionStorage for 60s so revisiting
//   /dashboard or /launches doesn't refire every request.
// - Soft-fail: any error just leaves the data null and the card hides
//   the row. We never break the card layout for live-data hiccups.

export interface PumpCoinStats {
  marketCapUsd: number | null;
  marketCapSol: number | null;
  bondingProgress: number | null;
  complete: boolean;
  holders: number | null;
}

const TTL_MS = 60 * 1000;

interface CacheEntry {
  at: number;
  stats: PumpCoinStats;
}

function readCache(mint: string): PumpCoinStats | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`koki:pump:${mint}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.at > TTL_MS) return null;
    return entry.stats;
  } catch {
    return null;
  }
}

function writeCache(mint: string, stats: PumpCoinStats) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `koki:pump:${mint}`,
      JSON.stringify({ at: Date.now(), stats } satisfies CacheEntry),
    );
  } catch {
    /* quota — ignore */
  }
}

export function usePumpCoin(mint: string | null | undefined): PumpCoinStats | null {
  const [stats, setStats] = useState<PumpCoinStats | null>(() =>
    mint ? readCache(mint) : null,
  );

  useEffect(() => {
    if (!mint) return;
    const cached = readCache(mint);
    if (cached) {
      setStats(cached);
      return;
    }

    let cancelled = false;
    fetch(`/api/pump-coin?mint=${encodeURIComponent(mint)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { ok: boolean; coin?: PumpCoinStats } | null) => {
        if (cancelled || !json || !json.ok || !json.coin) return;
        const next: PumpCoinStats = {
          marketCapUsd: json.coin.marketCapUsd ?? null,
          marketCapSol: json.coin.marketCapSol ?? null,
          bondingProgress: json.coin.bondingProgress ?? null,
          complete: Boolean(json.coin.complete),
          holders: json.coin.holders ?? null,
        };
        writeCache(mint, next);
        setStats(next);
      })
      .catch(() => {
        /* leave null */
      });

    return () => {
      cancelled = true;
    };
  }, [mint]);

  return stats;
}

/** Format a USD market cap for compact display ($12.4K, $1.2M, etc). */
export function formatMcUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value < 1000) return `$${value.toFixed(0)}`;
  if (value < 1_000_000) return `$${(value / 1000).toFixed(1)}K`;
  if (value < 1_000_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${(value / 1_000_000_000).toFixed(2)}B`;
}
