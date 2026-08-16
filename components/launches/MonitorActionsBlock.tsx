"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface ApiResponse {
  ok: boolean;
  provider?: string;
  model?: string;
  actions?: {
    headline: string;
    riskSignals: string[];
    actions: { title: string; why: string; priority: "now" | "today" | "watch" }[];
  };
  fallbackReason?: string;
  note?: string;
  error?: string;
}

interface Props {
  tokenName: string;
  ticker: string;
  mint: string;
  supplyUiAmount: number;
  top10SharePct: number;
  recentTxCount: number;
  hoursSinceLaunch?: number;
}

export default function MonitorActionsBlock(props: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/monitor-actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(props),
        });
        const json: ApiResponse = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.actions) {
          setError(json.error || `HTTP ${res.status}`);
        } else {
          setData(json);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mint]);

  if (loading) {
    return (
      <div className="card p-6 text-sm text-ink-300/72 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
        Generating suggested next actions…
      </div>
    );
  }
  if (error || !data?.actions) {
    return (
      <div className="card p-4 text-xs text-red-300 border-red-500/30">
        Suggested actions unavailable. {error}
      </div>
    );
  }

  const { headline, riskSignals, actions } = data.actions;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-ink-300" />
          <div className="text-sm font-semibold text-ink-300">Suggested next actions</div>
          {data.provider === "xai" ? (
            <Badge tone="live">Live AI</Badge>
          ) : (
            <Badge tone="mock">Stub</Badge>
          )}
        </div>
        <p className="text-sm text-ink-300 leading-relaxed">{headline}</p>
      </div>

      {riskSignals.length > 0 && (
        <div className="card p-5 border-amber-300/25">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <div className="text-sm font-semibold text-ink-300">Risk signals</div>
          </div>
          <ul className="space-y-2 text-sm text-amber-100/90">
            {riskSignals.map((r) => (
              <li key={r} className="flex gap-2.5">
                <span className="text-amber-300">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {actions.map((a) => (
          <div key={a.title} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold text-ink-300 tracking-tight">
                {a.title}
              </div>
              <Badge tone={a.priority === "now" ? "live" : a.priority === "today" ? "info" : "soon"}>
                {a.priority}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-ink-300/72 leading-relaxed">{a.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
