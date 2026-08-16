"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther, parseAbiItem, type Address } from "viem";
import { getPublicClient } from "@/lib/robinhood/client";
import { HAMR_CONTRACTS, HAMR_CURVE, formatUsd } from "@/lib/hamr";

// On-chain price chart for a bonding-curve token. No indexer needed:
// every CurveBuy/CurveSell event carries `newVirtualEth`, and on a
// constant-product curve price = vEth² / k, so the full price history
// reconstructs exactly from the event log.

const buyEvent = parseAbiItem(
  "event CurveBuy(address indexed token, address indexed buyer, uint256 ethIn, uint256 tokensOut, uint256 newVirtualEth)",
);
const sellEvent = parseAbiItem(
  "event CurveSell(address indexed token, address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 newVirtualEth)",
);

interface Point {
  price: number; // ETH per token
  kind: "launch" | "buy" | "sell";
}

const K = HAMR_CURVE.virtualEthStart * HAMR_CURVE.virtualTokenStart; // ETH·tokens
const LAUNCH_PRICE = HAMR_CURVE.virtualEthStart / HAMR_CURVE.virtualTokenStart;
const MAX_POINTS = 240;

function priceFromVirtualEth(newVirtualEthWei: bigint): number {
  const vEth = Number(formatEther(newVirtualEthWei));
  return (vEth * vEth) / K;
}

export default function PriceChart({
  token,
  ethUsd,
  refreshKey,
}: {
  token: Address;
  ethUsd: number | null;
  /** Bump to refetch (e.g. after the user trades). */
  refreshKey?: number;
}) {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
        ].sort((a, b) => {
          const bn = Number(a.log.blockNumber - b.log.blockNumber);
          if (bn !== 0) return bn;
          return (a.log.logIndex ?? 0) - (b.log.logIndex ?? 0);
        });
        const pts: Point[] = [{ price: LAUNCH_PRICE, kind: "launch" }];
        for (const { log, kind } of merged) {
          const v = (log.args as { newVirtualEth?: bigint }).newVirtualEth;
          if (typeof v === "bigint") {
            pts.push({ price: priceFromVirtualEth(v), kind });
          }
        }
        setPoints(pts.slice(-MAX_POINTS));
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void load();
    const id = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, refreshKey]);

  const view = useMemo(() => {
    if (!points || points.length === 0) return null;
    const w = 640;
    const h = 220;
    const padY = 14;
    const prices = points.map((p) => p.price);
    let min = Math.min(...prices);
    let max = Math.max(...prices);
    if (max === min) {
      // flat line — pad the range so it renders mid-chart
      min *= 0.9;
      max *= 1.1;
      if (max === 0) max = 1e-12;
    }
    const n = points.length;
    const x = (i: number) => (n === 1 ? w : (i / (n - 1)) * w);
    const y = (p: number) =>
      h - padY - ((p - min) / (max - min)) * (h - padY * 2);
    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`)
      .join(" ");
    const area = `${line} L${w},${h} L0,${h} Z`;
    const last = points[n - 1].price;
    const first = points[0].price;
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
    return { w, h, line, area, min, max, last, changePct, trades: n - 1 };
  }, [points]);

  const fmtPrice = (p: number) =>
    ethUsd
      ? formatUsd(p * ethUsd)
      : `${p.toLocaleString(undefined, { maximumSignificantDigits: 3 })} ETH`;

  return (
    <div className="card !p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <div className="eyebrow !text-[10px]">Price</div>
          <div className="mt-0.5 text-[20px] font-black tracking-tight tabular-nums">
            {view ? fmtPrice(view.last) : "—"}
            {view && (
              <span
                className={`ml-2 text-[12px] font-extrabold ${
                  view.changePct >= 0 ? "text-up" : "text-down"
                }`}
              >
                {view.changePct >= 0 ? "+" : ""}
                {view.changePct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        {view && (
          <div className="text-[11px] font-bold text-ink-300/50">
            {view.trades} trade{view.trades === 1 ? "" : "s"} · since launch
          </div>
        )}
      </div>

      {failed ? (
        <div className="h-[220px] flex items-center justify-center text-[12px] font-semibold text-ink-300/50">
          Chart unavailable — RPC log query failed.
        </div>
      ) : !view ? (
        <div className="h-[220px] rounded-xl bg-ink-1000/5 animate-pulse" />
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${view.w} ${view.h}`}
            className="w-full h-[220px]"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="hamr-chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={view.area} fill="url(#hamr-chart-fill)" />
            <path
              d={view.line}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="absolute top-1 right-2 text-[10px] font-bold text-ink-300/45 tabular-nums">
            {fmtPrice(view.max)}
          </div>
          <div className="absolute bottom-1 right-2 text-[10px] font-bold text-ink-300/45 tabular-nums">
            {fmtPrice(view.min)}
          </div>
          {view.trades === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-ink-1000/10 px-3 py-1 text-[11px] font-extrabold text-ink-300/60">
                No trades yet — launch price
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
