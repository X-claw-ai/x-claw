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
    <div className="card card-hover !p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-10 w-10 rounded-md bg-koki-500 border border-[var(--border-strong)] flex items-center justify-center text-ink-300 shrink-0">
            <Radar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[16px] font-black text-ink-300 truncate tracking-tight">
              {meme.name}
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-300/70 font-extrabold">
              ${meme.ticker}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="text-[10px] text-ink-300/55 font-bold">
            {meme.source}
          </span>
        </div>
      </div>

      <p className="text-[13px] text-ink-300/72 leading-snug font-medium">
        {meme.shortDescription}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <ScorePill label="Trend" value={meme.scores.trend} headline />
        <ScorePill label="X attn" value={meme.scores.xAttention} />
        <ScorePill label="Community" value={meme.scores.communityMomentum} />
        {!compact && (
          <>
            <ScorePill label="MC fit" value={meme.scores.memeCoinFit} />
            <ScorePill label="Onchain" value={meme.scores.onchainRelevance} />
            <ScorePill label="Timing" value={meme.scores.launchTiming} />
          </>
        )}
      </div>

      {!compact && (
        <div className="text-[11px] text-ink-300/55 font-bold">
          {meme.sampleTweetCount.toLocaleString()} sample posts, detected{" "}
          {timeSince(meme.detectedAt)}
        </div>
      )}

      <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-2">
        <Link
          href={`/analyze?meme=${meme.id}`}
          className="btn btn-secondary !py-1.5 !px-3 !text-xs flex-1"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Analyze
        </Link>
        <Link
          href={`/launch?meme=${meme.id}&go=1`}
          className="btn btn-primary !py-1.5 !px-3 !text-xs flex-1"
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
  const bg =
    value >= 90
      ? "bg-ink-1000 text-koki-500"
      : "bg-cream-50 text-ink-300";
  return (
    <div
      className={`rounded-[10px] border border-[var(--border-strong)] px-2 py-1.5 ${bg} ${
        headline ? "ring-2 ring-ink-1000" : ""
      }`}
    >
      <div className="text-[9px] uppercase tracking-[0.1em] opacity-80 font-extrabold">
        {label}
      </div>
      <div className={`tabular-nums font-black ${headline ? "text-[18px]" : "text-[14px]"}`}>
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
