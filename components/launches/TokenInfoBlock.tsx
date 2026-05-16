"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, ExternalLink, Coins } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface LargeAccount {
  address: string;
  amount: string;
  uiAmount: number;
}

interface TokenInfo {
  mint: string;
  supply: { uiAmount: number; amount: string; decimals: number };
  largestAccounts: LargeAccount[];
}

interface ApiResponse {
  ok: boolean;
  info?: TokenInfo;
  error?: string;
}

export default function TokenInfoBlock({ mint }: { mint: string }) {
  const [data, setData] = useState<TokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/token-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mint }),
        });
        const json: ApiResponse = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.info) {
          setError(json.error || `HTTP ${res.status}`);
        } else {
          setData(json.info);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mint]);

  if (loading) {
    return (
      <div className="card p-6 text-sm text-ink-300/65 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading the mint from Solana...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4 text-xs text-red-300 border-red-500/30 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">Couldn't read token info</div>
          <div className="mt-1 text-red-200/80">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalUi = data.supply.uiAmount;
  const top = data.largestAccounts.slice(0, 10);
  const topUi = top.reduce((acc, a) => acc + a.uiAmount, 0);
  const topPct = totalUi > 0 ? (topUi / totalUi) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-koki-500" />
          <div className="text-sm font-semibold">Token supply</div>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total supply" value={formatAmount(totalUi)} />
          <Stat label="Decimals" value={String(data.supply.decimals)} />
          <Stat label="Top 10 share" value={`${topPct.toFixed(1)}%`} tone={topPct > 60 ? "warn" : "good"} />
          <Stat label="Tracked holders" value={String(data.largestAccounts.length)} />
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Top holders</div>
          <a
            href={`https://solscan.io/token/${data.mint}#holders`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-ink-300/72 hover:text-ink-300"
          >
            All on Solscan
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="space-y-2">
          {top.map((h, i) => {
            const pct = totalUi > 0 ? (h.uiAmount / totalUi) * 100 : 0;
            return (
              <div
                key={h.address}
                className="flex items-center gap-3 border-b border-[var(--border-strong)]/20 pb-2 last:border-b-0 text-sm"
              >
                <div className="text-[10px] text-ink-300/65 w-5">#{i + 1}</div>
                <a
                  href={`https://solscan.io/account/${h.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-ink-300 hover:text-ink-300 truncate flex-1"
                >
                  {h.address}
                </a>
                <div className="tabular-nums text-ink-300 w-32 text-right">
                  {formatAmount(h.uiAmount)}
                </div>
                <Badge tone={pct > 20 ? "mock" : pct > 5 ? "neutral" : "live"}>
                  {pct.toFixed(2)}%
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const ring =
    tone === "good"
      ? "ring-koki-500/20"
      : tone === "warn"
      ? "ring-amber-300/20"
      : "ring-white/5";
  return (
    <div className={`card p-3 ring-1 ${ring}`}>
      <div className="text-[10px] uppercase tracking-widest text-ink-300/65">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums text-ink-300">
        {value}
      </div>
    </div>
  );
}

function formatAmount(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(6);
  if (n < 1_000) return n.toFixed(2);
  if (n < 1_000_000) return (n / 1_000).toFixed(2) + "K";
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(2) + "M";
  return (n / 1_000_000_000).toFixed(2) + "B";
}
