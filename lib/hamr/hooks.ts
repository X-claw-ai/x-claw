"use client";

// Client hooks around lib/hamr/read — polling snapshot for the live
// monitor page and the curve trade box.

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { readSnapshot, readTokenBalance, type HamrTokenSnapshot } from "./read";

export interface UseHamrTokenResult {
  snap: HamrTokenSnapshot | null;
  loading: boolean;
  error: string | null;
  /** Bump to force an immediate refetch (e.g. after a trade confirms). */
  refresh: () => void;
}

export function useHamrToken(
  token: Address | undefined,
  { refreshMs = 15_000 }: { refreshMs?: number } = {},
): UseHamrTokenResult {
  const [snap, setSnap] = useState<HamrTokenSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchOnce() {
      try {
        const s = await readSnapshot(token as Address);
        if (!cancelled) {
          setSnap(s);
          setError(s ? null : "Not a HAMR launchpad token");
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    }
    void fetchOnce();
    const timer = refreshMs > 0 ? setInterval(fetchOnce, refreshMs) : null;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [token, refreshMs, nonce]);

  return { snap, loading, error, refresh: () => setNonce((n) => n + 1) };
}

export function useTokenBalance(
  token: Address | undefined,
  owner: Address | undefined,
  refreshKey: unknown = null,
): bigint | null {
  const [bal, setBal] = useState<bigint | null>(null);
  useEffect(() => {
    if (!token || !owner) {
      setBal(null);
      return;
    }
    let cancelled = false;
    readTokenBalance(token, owner)
      .then((b) => {
        if (!cancelled) setBal(b);
      })
      .catch(() => {
        if (!cancelled) setBal(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, owner, refreshKey]);
  return bal;
}
