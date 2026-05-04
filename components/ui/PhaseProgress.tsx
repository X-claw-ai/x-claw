import Link from "next/link";
import { cn } from "@/lib/cn";

type Phase = "detect" | "analyze" | "generate" | "launch" | "monitor";

const ORDER: Phase[] = ["detect", "analyze", "generate", "launch", "monitor"];

const META: Record<Phase, { num: string; label: string; href?: string }> = {
  detect: { num: "01", label: "Detect", href: "/dashboard" },
  analyze: { num: "02", label: "Analyze" },
  generate: { num: "03", label: "Generate", href: "/launch" },
  launch: { num: "04", label: "Launch", href: "/launch" },
  monitor: { num: "05", label: "Monitor", href: "/launches" },
};

/**
 * Linear progress strip for the agent journey.
 *   Detect → Analyze → Generate → Launch → Monitor
 * Pass `current` as the phase you're on.
 */
export function PhaseProgress({
  current,
  className,
}: {
  current: Phase;
  className?: string;
}) {
  const idx = ORDER.indexOf(current);
  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-5 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/5">
        {ORDER.map((p, i) => {
          const m = META[p];
          const done = i < idx;
          const active = i === idx;
          const Wrap = m.href && !active
            ? ({ children }: { children: React.ReactNode }) => (
                <Link href={m.href!} className="block">{children}</Link>
              )
            : ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
          return (
            <Wrap key={p}>
              <div
                className={cn(
                  "px-3 py-2.5 text-center transition-colors",
                  active
                    ? "bg-koki-500/[0.08] border-b-2 border-koki-500"
                    : done
                    ? "bg-ink-950"
                    : "bg-ink-950 hover:bg-ink-900"
                )}
              >
                <div
                  className={cn(
                    "text-[10px] font-mono tracking-[0.18em]",
                    active ? "text-koki-400" : done ? "text-zinc-400" : "text-zinc-600"
                  )}
                >
                  {m.num}
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-xs font-semibold tracking-tight",
                    active ? "text-white" : done ? "text-zinc-300" : "text-zinc-500"
                  )}
                >
                  {m.label}
                </div>
              </div>
            </Wrap>
          );
        })}
      </div>
    </div>
  );
}
