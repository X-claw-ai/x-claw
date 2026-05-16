"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Compass,
  Users2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  type MemeAnalysis,
  READINESS_TONES,
} from "@/lib/memeAnalysis";
import { getRadarMeme, type RadarMeme } from "@/lib/memeRadar";

interface ApiResponse {
  ok: boolean;
  analysis?: MemeAnalysis;
  provider?: string | null;
  model?: string;
  fallbackReason?: string;
  note?: string;
  error?: string;
}

export default function MemeAnalysisView({ memeId }: { memeId: string }) {
  const [meme, setMeme] = useState<RadarMeme | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const m = getRadarMeme(memeId);
    setMeme(m ?? null);
    if (!m) {
      setLoading(false);
      setError(`Meme not found: ${memeId}`);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/meme-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memeId }),
        });
        const json: ApiResponse = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.analysis) {
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
  }, [memeId]);

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-ink-300" />
        <div className="mt-4 text-sm text-ink-300/72">
          Analyzing {meme?.name ?? memeId}…
        </div>
        <div className="mt-1 text-xs text-ink-300/55">
          Scoring viral potential, narrative clarity, and saturation risk.
        </div>
      </div>
    );
  }

  if (error || !meme || !data?.analysis) {
    return (
      <div className="card p-6 border-red-500/30 flex items-start gap-3 text-sm">
        <AlertCircle className="h-4 w-4 text-red-300 mt-0.5" />
        <div>
          <div className="font-semibold text-red-200">Analysis failed</div>
          <div className="mt-1 text-red-200/80">{error}</div>
        </div>
      </div>
    );
  }

  const a = data.analysis;
  const tone = READINESS_TONES[a.launchReadiness];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-300 mb-2">
              Analyze · Phase 02
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-display text-3xl md:text-4xl font-semibold tracking-extra-tight text-ink-300">
                {meme.name}
              </h2>
              <span className="text-ink-300/65 font-mono">${meme.ticker}</span>
              <Badge tone={tone}>Launch readiness: {a.launchReadiness}</Badge>
              {data.provider === "xai" ? (
                <Badge tone="live">Grok · {data.model}</Badge>
              ) : data.provider === "mock" ? (
                <Badge tone="mock">Stub · set XAI_API_KEY for Grok</Badge>
              ) : data.provider ? (
                <Badge tone="info">{data.provider} · {data.model}</Badge>
              ) : null}
            </div>
            <p className="mt-4 text-ink-300 text-base leading-relaxed max-w-3xl">
              {a.summary}
            </p>
          </div>
          <Link
            href={`/launch?meme=${meme.id}&go=1`}
            className="btn btn-primary !py-3 !px-5 shrink-0"
          >
            Generate Launch Kit
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {(data.note || data.fallbackReason) && (
          <div className="mt-5 surface p-3 text-xs text-amber-200 border-amber-300/30">
            {data.note || `Fallback: ${data.fallbackReason}`}
          </div>
        )}
      </div>

      {/* Why + Risks */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Block icon={TrendingUp} title="Why it has potential" iconClass="text-ink-300">
          <ul className="space-y-2 text-sm text-ink-300">
            {a.whyItHasPotential.map((b) => (
              <li key={b} className="flex gap-2.5">
                <span className="text-ink-300">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Block>
        <Block icon={AlertTriangle} title="Key risks" iconClass="text-amber-300">
          <ul className="space-y-2 text-sm text-ink-300">
            {a.keyRisks.map((b) => (
              <li key={b} className="flex gap-2.5">
                <span className="text-amber-300">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Block>
      </div>

      {/* Angle / Audience / Timing */}
      <div className="grid sm:grid-cols-3 gap-4">
        <KV icon={Compass} label="Best launch angle" value={a.bestLaunchAngle} />
        <KV icon={Users2} label="Recommended audience" value={a.recommendedAudience} />
        <KV icon={Clock} label="Recommended timing" value={a.recommendedTiming} />
      </div>

      {/* Criteria scoring grid */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-4 w-4 text-ink-300" />
          <div className="text-sm font-semibold text-ink-300">Scoring criteria</div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ["Viral potential", a.criteria.viralPotential],
            ["Meme clarity", a.criteria.memeClarity],
            ["X engagement", a.criteria.xEngagementPotential],
            ["Community fit", a.criteria.communityFit],
            ["Ticker strength", a.criteria.tickerStrength],
            ["Narrative", a.criteria.narrativeStrength],
            ["On-chain", a.criteria.onchainRelevance],
            ["Launch timing", a.criteria.launchTiming],
            ["Saturation risk", a.criteria.saturationRisk],
            ["Brand/legal risk", a.criteria.brandLegalRisk],
          ].map(([label, val]) => (
            <Score key={String(label)} label={String(label)} value={Number(val)} />
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href={`/launch?meme=${meme.id}&go=1`}
          className="btn btn-primary !py-3 !px-5"
        >
          Generate Launch Kit
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Block({
  icon: Icon,
  title,
  children,
  iconClass,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-4 w-4 ${iconClass ?? ""}`} />
        <div className="text-sm font-semibold text-ink-300">{title}</div>
      </div>
      {children}
    </div>
  );
}

function KV({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-ink-300" />
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-300/65">
          {label}
        </div>
      </div>
      <div className="mt-3 text-sm text-ink-300 leading-relaxed">{value}</div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  const isRisk = label.toLowerCase().includes("risk");
  // For risk scores, lower is better.
  const good = isRisk ? value < 40 : value >= 75;
  const mid = isRisk ? value < 60 : value >= 60;
  const tone = good
    ? "text-ink-300 border-koki-500/30"
    : mid
    ? "text-ink-300 border-[var(--border-strong)]"
    : "text-amber-300 border-amber-400/25";
  return (
    <div className={`surface p-3 border ${tone}`}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-300/65">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-extra-tight">
        {value}
      </div>
      <div className="mt-2 h-1 rounded bg-cream-50 overflow-hidden">
        <div
          className={`h-full ${good ? "bg-koki-500/70" : mid ? "bg-zinc-400/60" : "bg-amber-400/60"}`}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
