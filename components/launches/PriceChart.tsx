"use client";

import { useMemo } from "react";
import { formatUsd } from "@/lib/hamr";
import type { TradesData } from "./useTrades";

// Price chart for a bonding-curve token. Pure view — the trade history
// comes in via props from the shared useTrades hook so the stat cards
// and the chart never disagree.

export default function PriceChart({
  data,
  failed,
  ethUsd,
}: {
  data: TradesData | null;
  failed: boolean;
  ethUsd: number | null;
}) {
  const view = useMemo(() => {
    if (!data || data.points.length === 0) return null;
    const points = data.points;
    const w = 640;
    const h = 220;
    const padY = 14;
    const prices = points.map((p) => p.price);
    let min = Math.min(...prices);
    let max = Math.max(...prices);
    if (max === min) {
      min *= 0.9;
      max *= 1.1;
      if (max === 0) max = 1e-12;
    }
    const n = points.length;
    const x = (i: number) => (n === 1 ? w : (i / (n - 1)) * w);
    const y = (p: number) =>
      h - padY - ((p - min) / (max - min)) * (h - padY * 2);
    const line = points
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`,
      )
      .join(" ");
    const area = `${line} L${w},${h} L0,${h} Z`;
    const last = points[n - 1].price;
    const first = points[0].price;
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
    return { w, h, line, area, min, max, last, changePct, trades: n - 1 };
  }, [data]);

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
