"use client";

import { useEffect, useState } from "react";
import { formatEther, type Address } from "viem";
import { getPublicClient } from "@/lib/robinhood/client";
import {
  HAMR_V2,
  poolSwapEvent,
  priceEthFromSqrt,
  readPoolOf,
  tokenIsToken0,
  V2_PARAMS,
} from "@/lib/hamr/v2";

// Shared on-chain trade history for a HAMR v2 coin. Every launch IS a
// real Uniswap V3 pool, so history is simply the pool's own Swap
// events — the exact same data every bot/aggregator sees. One log
// query feeds the price chart AND the stat cards (24h volume, ATH).
//
// Direction: from the pool's perspective a BUY pays tokens out
// (token delta negative) and takes WETH in; price after each trade
// comes straight from the sqrtPriceX96 the event carries.

export interface TradePoint {
  price: number; // ETH per token, after this trade
  ts: number; // unix seconds (0 when unknown)
  ethAmount: number; // trade size in ETH
  kind: "launch" | "buy" | "sell";
  /** Wallet that received the trade output (undefined for launch). */
  trader?: string;
  /** Token amount bought/sold, in whole tokens. */
  tokenAmount?: number;
  txHash?: string;
}

export interface TradesData {
  points: TradePoint[];
  tradeCount: number;
  /** Sum of ETH traded (buys + sells) in the trailing 24h. */
  volume24hEth: number;
  /** Highest price ever seen in the pool (ETH per token). */
  athPriceEth: number;
}

const MAX_EVENTS = 300;
const MAX_BLOCK_LOOKUPS = 120;
const MAX_SENDER_LOOKUPS = 60;

// txHash → real trader (tx origin). Sells route through the router, so
// the Swap event's `recipient` is the ROUTER, not the person — resolve
// the actual wallet from the transaction itself. Cached forever (a
// mined tx never changes).
const senderCache = new Map<string, string>();

export function useTrades(token?: Address, refreshMs = 20_000) {
  const [data, setData] = useState<TradesData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let pool: Address | null = null;

    async function load() {
      try {
        const client = getPublicClient();
        if (!pool) pool = await readPoolOf(token!);
        if (!pool) {
          // Not a v2 token — nothing to chart.
          if (!cancelled)
            setData({
              points: [],
              tradeCount: 0,
              volume24hEth: 0,
              athPriceEth: 0,
            });
          return;
        }

        const logs = await client.getLogs({
          address: pool,
          event: poolSwapEvent,
          fromBlock: 0n,
          toBlock: "latest",
        });
        if (cancelled) return;

        const tokenIs0 = tokenIsToken0(token!);
        const sliced = logs
          .slice()
          .sort((a, b) => {
            const bn = Number(a.blockNumber - b.blockNumber);
            if (bn !== 0) return bn;
            return (a.logIndex ?? 0) - (b.logIndex ?? 0);
          })
          .slice(-MAX_EVENTS);

        // Block timestamps — one lookup per unique block, capped.
        const uniqueBlocks = [
          ...new Set(sliced.map((l) => l.blockNumber)),
        ].slice(-MAX_BLOCK_LOOKUPS);
        const tsEntries = await Promise.all(
          uniqueBlocks.map(async (bn) => {
            try {
              const b = await client.getBlock({ blockNumber: bn });
              return [bn.toString(), Number(b.timestamp)] as const;
            } catch {
              return [bn.toString(), 0] as const;
            }
          }),
        );
        if (cancelled) return;
        const tsMap = new Map(tsEntries);

        const points: TradePoint[] = [
          {
            price: V2_PARAMS.startPriceEth,
            ts: tsMap.get(sliced[0]?.blockNumber.toString() ?? "") ?? 0,
            ethAmount: 0,
            kind: "launch",
          },
        ];
        for (const l of sliced) {
          const a = l.args as {
            recipient?: string;
            amount0?: bigint;
            amount1?: bigint;
            sqrtPriceX96?: bigint;
          };
          if (
            typeof a.amount0 !== "bigint" ||
            typeof a.amount1 !== "bigint" ||
            typeof a.sqrtPriceX96 !== "bigint"
          )
            continue;
          const tokenDelta = tokenIs0 ? a.amount0 : a.amount1;
          const wethDelta = tokenIs0 ? a.amount1 : a.amount0;
          points.push({
            price: priceEthFromSqrt(a.sqrtPriceX96, tokenIs0),
            ts: tsMap.get(l.blockNumber.toString()) ?? 0,
            ethAmount: Math.abs(Number(formatEther(wethDelta))),
            kind: tokenDelta < 0n ? "buy" : "sell",
            trader: a.recipient,
            tokenAmount: Math.abs(Number(formatEther(tokenDelta))),
            txHash: l.transactionHash ?? undefined,
          });
        }

        // Fix attribution: whenever the event's recipient is the router
        // (all sells, some aggregator buys), swap in the tx origin.
        const routerLc = HAMR_V2.swapRouter.toLowerCase();
        const needsOrigin = points.filter(
          (p) =>
            p.txHash &&
            (p.trader ?? "").toLowerCase() === routerLc &&
            !senderCache.has(p.txHash),
        );
        await Promise.all(
          needsOrigin.slice(-MAX_SENDER_LOOKUPS).map(async (p) => {
            try {
              const tx = await client.getTransaction({
                hash: p.txHash as `0x${string}`,
              });
              senderCache.set(p.txHash!, tx.from);
            } catch {
              /* keep the router label rather than lying */
            }
          }),
        );
        if (cancelled) return;
        for (const p of points) {
          if (p.txHash && senderCache.has(p.txHash)) {
            p.trader = senderCache.get(p.txHash);
          }
        }

        const cutoff = Math.floor(Date.now() / 1000) - 86_400;
        const volume24hEth = points
          .filter((p) => p.kind !== "launch" && p.ts >= cutoff)
          .reduce((acc, p) => acc + p.ethAmount, 0);
        const athPriceEth = Math.max(...points.map((p) => p.price));

        setData({
          points,
          tradeCount: points.length - 1,
          volume24hEth,
          athPriceEth,
        });
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void load();
    const id = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, refreshMs]);

  return { data, failed };
}
