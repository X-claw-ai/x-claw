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
            <div className="h-10 w-10 rounded-md bg-claw-500/10 border border-claw-500/30 flex items-center justify-center text-claw-400">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-base font-semibold text-zinc-100">
                  Real-time Meme Radar
                </div>
                <Badge tone="live">Live</Badge>
                <Badge tone="mock">Mock data</Badge>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Detect → Analyze → Generate → Launch. Pick any signal below
                to prefill the launch wizard.
              </p>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            Detected {memes.length} memes
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {memes.map((m) => (
          <MemeCard key={m.id} meme={m} compact={compact} />
        ))}
      </div>
    </section>
  );
}
