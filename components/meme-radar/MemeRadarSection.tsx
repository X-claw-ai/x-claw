import { Radar } from "lucide-react";
import MemeCard from "./MemeCard";
import { Badge } from "@/components/ui/Badge";
import { RADAR_MEMES } from "@/lib/memeRadar";

interface Props {
  /** Show the heading + description block above the cards. Default true. */
  showHeader?: boolean;
  /** Limit how many cards to render (e.g. 3 for a landing preview). */
  limit?: number;
  /** Use compact card variant (fewer score pills). */
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
            <div className="h-10 w-10 rounded-full border border-claw-500/25 bg-claw-500/[0.06] flex items-center justify-center text-claw-400">
              <Radar className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-base font-semibold text-white tracking-tight">
                  Real-time Meme Radar
                </div>
                <Badge tone="mock">MOCK</Badge>
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                Detect → Analyze → Generate → Launch → Monitor · {RADAR_MEMES.length} signals
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
      <div className="mx-auto h-12 w-12 rounded-full border border-claw-500/25 bg-claw-500/[0.06] flex items-center justify-center text-claw-400 mb-6 relative">
        <Radar className="h-5 w-5" />
        <span className="absolute inset-0 rounded-full border border-claw-500/30 animate-ping" />
      </div>
      <div className="text-display text-2xl md:text-3xl font-semibold tracking-extra-tight text-white text-balance max-w-md mx-auto">
        Real-time trends are connecting.
      </div>
      <p className="mt-3 text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
        Once X API + Grok trend search + on-chain indexers are wired in,
        live trending memes appear here ready to be turned into launches.
      </p>
      <div className="mt-7 flex items-center justify-center gap-2 flex-wrap">
        <Badge tone="info">Pipeline · X API</Badge>
        <Badge tone="info">Pipeline · Grok search</Badge>
        <Badge tone="info">Pipeline · On-chain</Badge>
      </div>
      <p className="mt-7 text-xs text-zinc-600">
        In the meantime, you can launch from your own idea via the Launch wizard.
      </p>
    </div>
  );
}
