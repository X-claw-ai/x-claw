"use client";

// React hooks around lib/pons/read — thin wagmi-style wrappers that
// know how to auto-refresh live pool state without setting up bespoke
// intervals in every component.
//
// The base reads are stateless functions in ./read.ts. Everything here
// is client-only: we import useState/useEffect and rely on the wagmi
// public client already configured in the app's Wallet provider.

import { useEffect, useState } from "react";
import type { Address } from "viem";
import {
  readTokenMeta,
  readLaunchState,
  readGraduation,
  readPriceInWeth,
  type PonsTokenMeta,
  type PonsLaunchState,
  type PonsGraduation,
} from "./read";
import { PONS_CONTRACTS } from "./constants";

export interface PonsTokenSnapshot {
  meta: PonsTokenMeta | null;
  launch: PonsLaunchState | null;
  graduation: PonsGraduation | null;
  priceWeth: number | null;
  loading: boolean;
  error: string | null;
  factory: Address;
}

/**
 * One-shot + polling read of every relevant Pons value for a token.
 * `refreshMs = 0` disables polling (initial fetch only).
 */
export function usePonsToken(
  token: Address | undefined,
  { refreshMs = 20_000 }: { refreshMs?: number } = {},
): PonsTokenSnapshot {
  const [snap, setSnap] = useState<PonsTokenSnapshot>({
    meta: null,
    launch: null,
    graduation: null,
    priceWeth: null,
    loading: Boolean(token),
    error: null,
    factory: PONS_CONTRACTS.factory,
  });

  useEffect(() => {
    if (!token) {
      setSnap((s) => ({ ...s, loading: false }));
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function fetchOnce(factory: Address) {
      try {
        const [meta, launch, graduation] = await Promise.all([
          readTokenMeta(token!),
          readLaunchState(token!, factory),
          readGraduation(token!, factory),
        ]);
        let priceWeth: number | null = null;
        if (meta?.pool && launch) {
          try {
            priceWeth = await readPriceInWeth(meta.pool, launch.isToken0);
          } catch {
            /* pool not yet initialized, price will show as - */
          }
        }
        if (!cancelled) {
          setSnap({
            meta,
            launch,
            graduation,
            priceWeth,
            loading: false,
            error: null,
            factory,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setSnap((s) => ({
            ...s,
            loading: false,
            error:
              err instanceof Error
                ? err.message
                : "Failed to read Pons token state",
          }));
        }
      }
    }

    // Try current factory first; fall back to legacy factory if the token
    // doesn't exist on the current one. Older tokens still resolve.
    (async () => {
      await fetchOnce(PONS_CONTRACTS.factory);
      if (cancelled) return;
      // If snap.launch stayed null, retry against legacy.
      setSnap((s) => {
        if (s.launch === null && s.meta === null) {
          void fetchOnce(PONS_CONTRACTS.legacyFactory);
        }
        return s;
      });
    })();

    if (refreshMs > 0) {
      timer = setInterval(() => {
        void fetchOnce(PONS_CONTRACTS.factory);
      }, refreshMs);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [token, refreshMs]);

  return snap;
}
