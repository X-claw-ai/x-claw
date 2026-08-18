"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatUsd } from "@/lib/hamr";
import type { TradesData } from "./useTrades";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";

// TradingView-style candlestick chart (lightweight-charts — TradingView's
// open-source engine). Candles are built client-side from the on-chain
// trade history: every CurveBuy/CurveSell carries the post-trade price,
// block timestamps give the time axis. No indexer, no external feed.

interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

const INTERVALS = [
  { label: "1m", sec: 60 },
  { label: "5m", sec: 300 },
  { label: "1h", sec: 3600 },
] as const;

function buildCandles(
  data: TradesData,
  intervalSec: number,
  ethUsd: number | null,
): Candle[] {
  const scale = ethUsd ?? 1;
  const pts = data.points.filter((p) => p.ts > 0);
  if (pts.length === 0) return [];
  const buckets = new Map<number, Candle>();
  for (const p of pts) {
    const t = Math.floor(p.ts / intervalSec) * intervalSec;
    const price = p.price * scale;
    const c = buckets.get(t);
    if (!c) {
      buckets.set(t, {
        time: t as UTCTimestamp,
        open: price,
        high: price,
        low: price,
        close: price,
      });
    } else {
      c.high = Math.max(c.high, price);
      c.low = Math.min(c.low, price);
      c.close = price;
    }
  }
  const sparse = [...buckets.values()].sort((a, b) => a.time - b.time);
  // Candle continuity: each bucket opens at the previous close, the way
  // an exchange feed would render it.
  for (let i = 1; i < sparse.length; i++) {
    sparse[i].open = sparse[i - 1].close;
    sparse[i].high = Math.max(sparse[i].high, sparse[i].open);
    sparse[i].low = Math.min(sparse[i].low, sparse[i].open);
  }

  // Gap-fill: quiet intervals become flat candles at the previous
  // close, so a token with 2 trades a day still draws a continuous
  // chart instead of two invisible dots. Capped so a long-lived token
  // on a small interval can't allocate silly amounts of candles.
  const nowBucket = Math.floor(Date.now() / 1000 / intervalSec) * intervalSec;
  const end = Math.max(nowBucket, sparse[sparse.length - 1].time as number);
  const span = end - (sparse[0].time as number);
  const MAX_CANDLES = 2000;
  if (span / intervalSec + 1 > MAX_CANDLES) {
    // Too many buckets to fill — return the sparse set untouched.
    return sparse;
  }
  const out: Candle[] = [];
  let si = 0;
  let lastClose = sparse[0].open;
  for (let t = sparse[0].time as number; t <= end; t += intervalSec) {
    if (si < sparse.length && (sparse[si].time as number) === t) {
      out.push(sparse[si]);
      lastClose = sparse[si].close;
      si++;
    } else {
      out.push({
        time: t as UTCTimestamp,
        open: lastClose,
        high: lastClose,
        low: lastClose,
        close: lastClose,
      });
    }
  }
  return out;
}

export default function PriceChart({
  data,
  failed,
  ethUsd,
}: {
  data: TradesData | null;
  failed: boolean;
  ethUsd: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [interval, setIntervalSec] = useState<number>(300);
  // Chart mounts via async import — data must not be pushed until the
  // series exists, and the push effect must re-run once it does.
  const [chartReady, setChartReady] = useState(false);

  const candles = useMemo(
    () => (data ? buildCandles(data, interval, ethUsd) : []),
    [data, interval, ethUsd],
  );

  const header = useMemo(() => {
    if (!data || data.points.length === 0) return null;
    const prices = data.points.map((p) => p.price);
    const last = prices[prices.length - 1];
    const first = prices[0];
    return {
      last,
      changePct: first > 0 ? ((last - first) / first) * 100 : 0,
      trades: data.tradeCount,
    };
  }, [data]);

  const fmtPrice = (p: number) =>
    ethUsd
      ? formatUsd(p * ethUsd)
      : `${p.toLocaleString(undefined, { maximumSignificantDigits: 3 })} ETH`;

  // Chart lifecycle — created once, candles streamed in on every update.
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function mount() {
      if (!containerRef.current || chartRef.current) return;
      const { createChart, ColorType, CrosshairMode } = await import(
        "lightweight-charts"
      );
      if (disposed || !containerRef.current) return;

      const el = containerRef.current;
      const chart = createChart(el, {
        width: el.clientWidth,
        height: 280,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#8B8B9E",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: "rgba(244,244,248,0.04)" },
          horzLines: { color: "rgba(244,244,248,0.04)" },
        },
        crosshair: { mode: CrosshairMode.Magnet },
        rightPriceScale: { borderColor: "rgba(244,244,248,0.08)" },
        timeScale: {
          borderColor: "rgba(244,244,248,0.08)",
          timeVisible: true,
          secondsVisible: false,
        },
      });
      const series = chart.addCandlestickSeries({
        upColor: "#34D399",
        downColor: "#F87171",
        borderUpColor: "#34D399",
        borderDownColor: "#F87171",
        wickUpColor: "#34D399",
        wickDownColor: "#F87171",
        priceFormat: {
          type: "custom",
          minMove: 1e-12,
          formatter: (v: number) =>
            v >= 0.01
              ? v.toLocaleString("en-US", { maximumFractionDigits: 4 })
              : v.toLocaleString("en-US", {
                  maximumSignificantDigits: 3,
                  maximumFractionDigits: 12,
                }),
        },
      });
      chartRef.current = chart;
      seriesRef.current = series;
      setChartReady(true);

      const ro = new ResizeObserver(() => {
        chart.applyOptions({ width: el.clientWidth });
      });
      ro.observe(el);
      cleanup = () => {
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
        seriesRef.current = null;
        setChartReady(false);
      };
    }

    void mount();
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  // Push candles whenever data / interval / price scale changes — and
  // once more the moment the chart finishes mounting.
  useEffect(() => {
    if (!chartReady || !seriesRef.current || candles.length === 0) return;
    seriesRef.current.setData(candles);
    chartRef.current?.timeScale().fitContent();
  }, [candles, chartReady]);

  return (
    <div className="card !p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <div className="eyebrow !text-[10px]">Price</div>
          <div className="mt-0.5 text-[20px] font-black tracking-tight tabular-nums">
            {header ? fmtPrice(header.last) : "—"}
            {header && (
              <span
                className={`ml-2 text-[12px] font-extrabold ${
                  header.changePct >= 0 ? "text-up" : "text-down"
                }`}
              >
                {header.changePct >= 0 ? "+" : ""}
                {header.changePct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {header && (
            <span className="text-[11px] font-bold text-ink-300/50 mr-1">
              {header.trades} trade{header.trades === 1 ? "" : "s"}
            </span>
          )}
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-bg-elevated p-0.5">
            {INTERVALS.map((iv) => (
              <button
                key={iv.sec}
                type="button"
                onClick={() => setIntervalSec(iv.sec)}
                className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-colors ${
                  interval === iv.sec
                    ? "bg-koki-500 text-white"
                    : "text-ink-300/60 hover:text-ink-300"
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {failed ? (
        <div className="h-[280px] flex items-center justify-center text-[12px] font-semibold text-ink-300/50">
          Chart unavailable — RPC log query failed.
        </div>
      ) : (
        <div className="relative">
          <div ref={containerRef} className="h-[280px] w-full" />
          {!data && (
            <div className="absolute inset-0 rounded-xl bg-ink-1000/5 animate-pulse" />
          )}
          {data && data.tradeCount === 0 && (
            <div className="absolute inset-x-0 top-2 flex justify-center pointer-events-none">
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
