"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { explorerUrl } from "@/lib/robinhood/chain";
import type { TradesData } from "./useTrades";

// Live trade feed for a curve token — pump.fun style. Rows come from
// the same on-chain CurveBuy/CurveSell events the chart uses, newest
// first, with a type filter and a min-size filter.

type TypeFilter = "all" | "buy" | "sell";

const MAX_ROWS = 50;

function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  return n.toFixed(0);
}

function fmtEthAmt(n: number): string {
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(4);
  return n.toPrecision(2);
}

function relTime(ts: number, now: number): string {
  const s = Math.max(0, now - ts);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TradesTable({
  data,
  failed,
}: {
  data: TradesData | null;
  failed: boolean;
}) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sizeOn, setSizeOn] = useState(false);
  const [minEth, setMinEth] = useState("0.05");
  // Tick every 5s so "1s ago" stays honest between data polls.
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5_000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    if (!data) return null;
    const min = sizeOn ? Number(minEth) || 0 : 0;
    return data.points
      .filter((p) => p.kind !== "launch")
      .filter((p) => (typeFilter === "all" ? true : p.kind === typeFilter))
      .filter((p) => p.ethAmount >= min)
      .slice()
      .reverse()
      .slice(0, MAX_ROWS);
  }, [data, typeFilter, sizeOn, minEth]);

  return (
    <div className="card !p-5">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-[15px] font-black tracking-tight">Trades</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="!w-auto !py-1.5 !px-2.5 !text-[12px] font-extrabold rounded-lg"
          >
            <option value="all">All trades</option>
            <option value="buy">Buys</option>
            <option value="sell">Sells</option>
          </select>
          <label className="inline-flex items-center gap-2 text-[12px] font-bold text-ink-300/60 cursor-pointer select-none">
            Filter by size
            <button
              type="button"
              role="switch"
              aria-checked={sizeOn}
              onClick={() => setSizeOn((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                sizeOn ? "bg-koki-500" : "bg-ink-1000/15"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                  sizeOn ? "left-[18px]" : "left-0.5"
                }`}
              />
            </button>
          </label>
          {sizeOn && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-2 py-1">
              <span className="text-[10px] font-black text-ink-300/50">Ξ</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={minEth}
                onChange={(e) => setMinEth(e.target.value)}
                className="!w-16 !p-0 !border-0 !bg-transparent !text-[12px] font-extrabold tabular-nums"
              />
            </div>
          )}
        </div>
      </div>

      {failed ? (
        <div className="py-6 text-center text-[12px] font-semibold text-ink-300/50">
          Trade feed unavailable — RPC log query failed.
        </div>
      ) : rows === null ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-ink-1000/5 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-6 text-center text-[12px] font-semibold text-ink-300/50">
          {data && data.tradeCount === 0
            ? "No trades yet — be the first."
            : "No trades match the filter."}
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <div className="min-w-[480px]">
            {/* Header */}
            <div className="grid grid-cols-[1.4fr_0.7fr_1fr_1fr_0.9fr] gap-3 px-2 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-300/45 border-b border-[var(--border)]">
              <span>Account</span>
              <span>Type</span>
              <span className="text-right">Amount (ETH)</span>
              <span className="text-right">Tokens</span>
              <span className="text-right">Time</span>
            </div>
            <ul>
              {rows.map((t, i) => (
                <li
                  key={`${t.txHash ?? i}-${i}`}
                  className="grid grid-cols-[1.4fr_0.7fr_1fr_1fr_0.9fr] items-center gap-3 px-2 py-2.5 border-b border-[var(--border)] last:border-b-0"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Image
                      src="/clip-avatar.png"
                      alt=""
                      width={22}
                      height={22}
                      className="rounded-full shrink-0 border border-[var(--border-strong)]"
                    />
                    <a
                      href={
                        t.trader ? explorerUrl("address", t.trader) : "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[12px] font-bold text-ink-300/85 hover:text-ink-300 hover:underline truncate"
                    >
                      {t.trader
                        ? `${t.trader.slice(0, 6)}…${t.trader.slice(-4)}`
                        : "—"}
                    </a>
                  </span>
                  <span
                    className={`text-[12px] font-black ${
                      t.kind === "buy" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {t.kind === "buy" ? "Buy" : "Sell"}
                  </span>
                  <span className="text-right text-[12px] font-extrabold tabular-nums">
                    {fmtEthAmt(t.ethAmount)}
                  </span>
                  <span
                    className={`text-right text-[12px] font-extrabold tabular-nums ${
                      t.kind === "buy" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {t.tokenAmount ? fmtTokens(t.tokenAmount) : "—"}
                  </span>
                  <span className="text-right text-[11px] font-bold text-ink-300/55 tabular-nums whitespace-nowrap">
                    {t.txHash ? (
                      <a
                        href={explorerUrl("tx", t.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-ink-300 hover:underline"
                      >
                        {t.ts > 0 ? relTime(t.ts, now) : "—"}
                        <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                      </a>
                    ) : t.ts > 0 ? (
                      relTime(t.ts, now)
                    ) : (
                      "—"
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
