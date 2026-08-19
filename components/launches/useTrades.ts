"use client";

import { useEffect, useState } from "react";
import { formatEther, parseAbiItem, type Address } from "viem";
import { getPublicClient } from "@/lib/robinhood/client";
import { HAMR_CONTRACTS, HAMR_CURVE } from "@/lib/hamr";

// Shared on-chain trade history for a curve token. One log query feeds
// the price chart AND the stat cards (24h volume, ATH) — no indexer.
//
// Price reconstruction: constant-product curve, so after every trade
// price = vEth² / k, and both CurveBuy and CurveSell events carry
// `newVirtualEth`. Volume comes from ethIn/ethOut on the same events;
// timestamps from the blocks the events landed in.

const buyEvent = parseAbiItem(
  "event CurveBuy(address indexed token, address indexed buyer, uint256 ethIn, uint256 tokensOut, uint256 newVirtualEth)",
);
const sellEvent = parseAbiItem(
  "event CurveSell(address indexed token, address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 newVirtualEth)",
);

export interface TradePoint {
  price: number; // ETH per token, after this trade
  ts: number; // unix seconds (0 when unknown)
  ethAmount: number; // trade size in ETH
  kind: "launch" | "buy" | "sell";
  /** Wallet that made the trade (undefined for the launch point). */
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
  /** Highest price ever seen on the curve (ETH per token). */
  athPriceEth: number;
}

const K = HAMR_CURVE.virtualEthStart * HAMR_CURVE.virtualTokenStart;
const LAUNCH_PRICE = HAMR_CURVE.virtualEthStart / HAMR_CURVE.virtualTokenStart;
const MAX_EVENTS = 300;
const MAX_BLOCK_LOOKUPS = 120;

export function useTrades(token?: Address, refreshMs = 20_000) {
  const [data, setData] = useState<TradesData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const client = getPublicClient();
        const common = {
          address: HAMR_CONTRACTS.launchpad,
          args: { token },
          fromBlock: 0n,
          toBlock: "latest",
        } as const;
        const [buys, sells] = await Promise.all([
          client.getLogs({ ...common, event: buyEvent }),
          client.getLogs({ ...common, event: sellEvent }),
        ]);
        if (cancelled) return;

        const merged = [
          ...buys.map((l) => ({ log: l, kind: "buy" as const })),
          ...sells.map((l) => ({ log: l, kind: "sell" as const })),
        ]
          .sort((a, b) => {
            const bn = Number(a.log.blockNumber - b.log.blockNumber);
            if (bn !== 0) return bn;
            return (a.log.logIndex ?? 0) - (b.log.logIndex ?? 0);
          })
          .slice(-MAX_EVENTS);

        // Block timestamps — one lookup per unique block, capped.
        const uniqueBlocks = [
          ...new Set(merged.map((m) => m.log.blockNumber)),
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
            price: LAUNCH_PRICE,
            ts: tsMap.get(merged[0]?.log.blockNumber.toString() ?? "") ?? 0,
            ethAmount: 0,
            kind: "launch",
          },
        ];
        for (const { log, kind } of merged) {
          const args = log.args as {
            newVirtualEth?: bigint;
            ethIn?: bigint;
            ethOut?: bigint;
            buyer?: string;
            seller?: string;
            tokensOut?: bigint;
            tokensIn?: bigint;
          };
          if (typeof args.newVirtualEth !== "bigint") continue;
          const vEth = Number(formatEther(args.newVirtualEth));
          points.push({
            price: (vEth * vEth) / K,
            ts: tsMap.get(log.blockNumber.toString()) ?? 0,
            ethAmount: Number(
              formatEther(kind === "buy" ? (args.ethIn ?? 0n) : (args.ethOut ?? 0n)),
            ),
            kind,
            trader: kind === "buy" ? args.buyer : args.seller,
            tokenAmount: Number(
              formatEther(
                kind === "buy" ? (args.tokensOut ?? 0n) : (args.tokensIn ?? 0n),
              ),
            ),
            txHash: log.transactionHash ?? undefined,
          });
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
