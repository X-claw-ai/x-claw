"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  Loader2,
  AlertCircle,
  ExternalLink,
  Copy,
  Wallet as WalletIcon,
  Twitter,
} from "lucide-react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface TokenHolding {
  mint: string;
  uiAmount: number;
  decimals: number;
}

interface RecentTx {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: string | null;
}

interface WalletReport {
  address: string;
  solBalance: number;
  tokenCount: number;
  topTokens: TokenHolding[];
  recentTxs: RecentTx[];
  rpcUrl: string;
}

interface SummaryShape {
  headline?: string;
  summary?: string;
  highlights?: string[];
  xPost?: string;
}

interface ApiResponse {
  ok: boolean;
  report?: WalletReport;
  summary?: SummaryShape | null;
  provider?: string | null;
  model?: string;
  error?: string;
  stage?: string;
  note?: string;
  summaryFallbackReason?: string;
}

const SAMPLE = "AKnL4NNf3DGWZJZ3QXQK8AVCb8X7Nqe4hcfTVrDqVZTJ"; // Pump.fun example

export default function WalletTrackingAgent({
  defaultAddress,
  autoRun = false,
}: {
  defaultAddress?: string;
  autoRun?: boolean;
} = {}) {
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoRun && defaultAddress) {
      void run(defaultAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(addr: string) {
    if (!addr) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/wallet-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const json: ApiResponse = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || `HTTP ${res.status}`);
      } else {
        setData(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-koki-500" />
          <h2 className="text-lg font-semibold">Wallet Tracking Agent</h2>
          <Badge tone="live">Live · On-chain</Badge>
        </div>
        <p className="text-sm text-ink-300/72 max-w-2xl">
          Pull a public Solana wallet's on-chain footprint and let Grok turn
          the raw data into an X-native intelligence brief. Read-only, KOKi
          never asks for private keys.
        </p>

        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <Field label="Solana wallet address">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Paste a Solana pubkey (e.g. a creator or a treasury)"
              spellCheck={false}
            />
          </Field>
          <div className="flex gap-2">
            <Button onClick={() => run(address)} disabled={loading || !address}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Tracking...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" /> Track
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAddress(SAMPLE);
                run(SAMPLE);
              }}
              disabled={loading}
            >
              Sample
            </Button>
          </div>
        </div>

        {error && (
          <div className="card p-3 text-xs text-red-300 border-red-500/30 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Tracking failed</div>
              <div className="mt-1 text-red-200/80">{error}</div>
            </div>
          </div>
        )}
      </div>

      {data?.report && (
        <ReportView
          report={data.report}
          summary={data.summary ?? null}
          provider={data.provider ?? null}
          model={data.model}
          fallbackReason={data.summaryFallbackReason}
          note={data.note}
        />
      )}
    </div>
  );
}

function ReportView({
  report,
  summary,
  provider,
  model,
  fallbackReason,
  note,
}: {
  report: WalletReport;
  summary: SummaryShape | null;
  provider: string | null;
  model?: string;
  fallbackReason?: string;
  note?: string;
}) {
  const solscan = `https://solscan.io/account/${report.address}`;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WalletIcon className="h-4 w-4 text-koki-500" />
            <span className="font-mono">{shortAddr(report.address)}</span>
          </div>
          <div className="flex gap-2">
            {provider && (
              <Badge tone={provider === "xai" ? "live" : "neutral"}>
                Brief by {provider} {model ? `· ${model}` : ""}
              </Badge>
            )}
            <a
              href={solscan}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-ink-300 hover:underline"
            >
              Solscan <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="SOL balance" value={report.solBalance.toFixed(4)} />
          <Stat label="Token positions" value={String(report.tokenCount)} />
          <Stat label="Recent tx (sample)" value={String(report.recentTxs.length)} />
          <Stat label="Errors" value={String(report.recentTxs.filter((t) => t.err).length)} />
        </div>
      </div>

      {summary && (summary.headline || summary.summary || summary.highlights) && (
        <div className="card p-5">
          <div className="text-[10px] uppercase tracking-widest text-koki-500">
            Intelligence brief
          </div>
          {summary.headline && (
            <div className="mt-1 text-base font-semibold text-ink-300">
              {summary.headline}
            </div>
          )}
          {summary.summary && (
            <p className="mt-3 text-sm text-ink-300 leading-relaxed">
              {summary.summary}
            </p>
          )}
          {summary.highlights && summary.highlights.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-ink-300">
              {summary.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="text-koki-500">•</span>
                  {h}
                </li>
              ))}
            </ul>
          )}
          {summary.xPost && <XPostCard text={summary.xPost} />}
        </div>
      )}

      {!summary && (note || fallbackReason) && (
        <div className="card p-4 text-xs text-amber-200 border-amber-300/30">
          {note || `AI summary unavailable: ${fallbackReason}`}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-sm font-semibold mb-3">Top token positions</div>
          {report.topTokens.length === 0 ? (
            <div className="text-xs text-ink-300/65">
              No SPL token balances found on this wallet.
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {report.topTokens.map((t) => (
                <div
                  key={t.mint}
                  className="flex items-center justify-between gap-3 border-b border-[var(--border-strong)]/20 pb-2 last:border-b-0"
                >
                  <a
                    href={`https://solscan.io/token/${t.mint}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-ink-300 hover:text-ink-300 truncate max-w-[60%]"
                  >
                    {t.mint}
                  </a>
                  <div className="text-ink-300 tabular-nums">
                    {formatAmount(t.uiAmount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="text-sm font-semibold mb-3">Recent transactions</div>
          {report.recentTxs.length === 0 ? (
            <div className="text-xs text-ink-300/65">
              No recent transactions found.
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {report.recentTxs.slice(0, 12).map((tx) => (
                <div
                  key={tx.signature}
                  className="flex items-center justify-between gap-3 border-b border-[var(--border-strong)]/20 pb-2 last:border-b-0"
                >
                  <a
                    href={`https://solscan.io/tx/${tx.signature}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-ink-300 hover:text-ink-300 truncate max-w-[55%]"
                  >
                    {tx.signature}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-300/65">
                      slot {tx.slot}
                    </span>
                    <Badge tone={tx.err ? "danger" : "live"}>
                      {tx.err ? "err" : "ok"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function XPostCard({ text }: { text: string }) {
  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }
  const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  return (
    <div className="mt-5 card p-4 border-koki-500/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Twitter className="h-4 w-4 text-koki-500" />
          Ready-to-post on X
        </div>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 text-xs text-ink-300/72 hover:text-ink-300"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
          <a
            href={intent}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-ink-300 hover:underline"
          >
            Open in X <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <pre className="text-xs whitespace-pre-wrap text-ink-300 font-sans leading-relaxed">
        {text}
      </pre>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-widest text-ink-300/65">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-ink-300 tabular-nums">
        {value}
      </div>
    </div>
  );
}

function shortAddr(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatAmount(n: number): string {
  if (n === 0) return "0";
  if (n < 0.001) return n.toExponential(2);
  if (n < 1) return n.toFixed(6);
  if (n < 1_000) return n.toFixed(4);
  if (n < 1_000_000) return n.toFixed(2);
  return n.toExponential(3);
}
