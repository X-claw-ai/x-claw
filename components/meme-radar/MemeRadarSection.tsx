import { Radar } from "lucide-react";
import MemeCard from "./MemeCard";
import { Badge } from "@/components/ui/Badge";
import { RADAR_MEMES } from "@/lib/memeRadar";

interface Props {
  showHeader?: boolean;
  limit?: number;
  compact?: boolean;
}

export default function MemeRadarSection({
  showHeader = true,
  limit,
  compact = false,
}: Props) {
  const memes = limit ? RADAR_MEMES.slice(0, limit) : RADAR_MEMES;

  return (
    <section className="space-y-6">
      {showHeader && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full border border-[var(--border-strong)] bg-cream-50 flex items-center justify-center text-ink-300">
              <Radar className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-[18px] font-black text-ink-300 tracking-tight">
                  Live Meme Radar
                </div>
                {memes.length === 0 ? (
                  <Badge tone="soon">Pipeline</Badge>
                ) : (
                  <Badge tone="live">Live</Badge>
                )}
              </div>
              <p className="text-[12px] text-ink-300/65 mt-1 font-bold">
                Detect → Analyze → Generate → Launch → Monitor.{" "}
                {memes.length === 0 ? "No signals yet." : `${memes.length} signals.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {memes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memes.map((m) => (
            <MemeCard key={m.id} meme={m} compact={compact} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="surface p-12 md:p-16 text-center">
      <div className="mx-auto h-14 w-14 rounded-full border border-[var(--border-strong)] bg-cream-50 flex items-center justify-center text-ink-300 mb-6 relative">
        <Radar className="h-5 w-5" />
        <span className="absolute inset-0 rounded-full border border-[var(--border-strong)] animate-ping opacity-40" />
      </div>
      <div className="text-display text-display-sm text-balance max-w-md mx-auto">
        Live trends are connecting.
      </div>
      <p className="mt-3 text-[14px] text-ink-300/72 max-w-md mx-auto leading-relaxed font-medium">
        Once X API + live trend search + onchain indexers are wired in,
        live trending memes appear here ready to be turned into launches.
      </p>
      <div className="mt-7 flex items-center justify-center gap-2 flex-wrap">
        <Badge tone="info">Pipeline, X API</Badge>
        <Badge tone="info">Pipeline, X search</Badge>
        <Badge tone="info">Pipeline, Onchain</Badge>
      </div>
      <p className="mt-7 text-[11px] text-ink-300/55 font-bold">
        In the meantime, you can launch from your own idea via the Launch wizard.
      </p>
    </div>
  );
}
