import Link from "next/link";
import { Sparkles, Rocket, Radar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { READINESS_META, type RadarMeme } from "@/lib/memeRadar";

interface Props {
  meme: RadarMeme;
  /** When true, render a denser variant for tight grids (landing preview). */
  compact?: boolean;
}

export default function MemeCard({ meme, compact = false }: Props) {
  const meta = READINESS_META[meme.launchReadiness];

  return (
    <div className="card card-hover p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-md bg-claw-500/10 border border-claw-500/30 flex items-center justify-center text-claw-400 shrink-0">
            <Radar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-zinc-100 truncate">
              {meme.name}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-claw-500">
              ${meme.ticker}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="text-[10px] text-zinc-500">
            {meme.source}
          </span>
        </div>
      </div>

      <p className="text-sm text-zinc-400 leading-relaxed">
        {meme.shortDescription}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <ScorePill label="Trend" value={meme.scores.trend} headline />
        <ScorePill label="X attn" value={meme.scores.xAttention} />
        <ScorePill label="Community" value={meme.scores.communityMomentum} />
        {!compact && (
          <>
            <ScorePill label="MC fit" value={meme.scores.memeCoinFit} />
            <ScorePill label="On-chain" value={meme.scores.onchainRelevance} />
            <ScorePill label="Timing" value={meme.scores.launchTiming} />
          </>
        )}
      </div>

      {!compact && (
        <div className="text-[11px] text-zinc-500">
          {meme.sampleTweetCount.toLocaleString()} sample posts · detected{" "}
          {timeSince(meme.detectedAt)}
        </div>
      )}

      <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-2">
        <Link
          href={`/analyze?meme=${meme.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:border-claw-500/40 transition flex-1"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Analyze
        </Link>
        <Link
          href={`/launch?meme=${meme.id}&go=1`}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-claw-500 text-ink-950 px-3 py-1.5 text-xs font-semibold hover:bg-claw-400 transition flex-1"
        >
          <Rocket className="h-3.5 w-3.5" />
          Launch
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function ScorePill({
  label,
  value,
  headline = false,
}: {
  label: string;
  value: number;
  headline?: boolean;
}) {
  const tone =
    value >= 90
      ? "text-claw-400 border-claw-500/40 bg-claw-500/5"
      : value >= 80
      ? "text-zinc-100 border-white/10 bg-white/[0.03]"
      : value >= 70
      ? "text-zinc-300 border-white/10 bg-white/[0.02]"
      : "text-zinc-500 border-white/5 bg-transparent";
  return (
    <div
      className={`rounded-md border px-2 py-1.5 ${tone} ${
        headline ? "ring-1 ring-claw-500/20" : ""
      }`}
    >
      <div className="text-[9px] uppercase tracking-widest opacity-70">
        {label}
      </div>
      <div className={`tabular-nums font-semibold ${headline ? "text-base" : "text-sm"}`}>
        {value}
      </div>
    </div>
  );
}

function timeSince(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return "just now";
    const min = Math.floor(ms / 60_000);
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  } catch {
    return "recently";
  }
}
