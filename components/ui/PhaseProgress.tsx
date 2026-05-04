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
 * 5-step linear progress strip — Detect → Analyze → Generate → Launch → Monitor.
 * Style: black hairline, cream tiles, active = solid black tile with orange text.
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
      <div className="grid grid-cols-5 gap-2">
        {ORDER.map((p, i) => {
          const m = META[p];
          const done = i < idx;
          const active = i === idx;
          const Wrap =
            m.href && !active
              ? ({ children }: { children: React.ReactNode }) => (
                  <Link href={m.href!} className="block">
                    {children}
                  </Link>
                )
              : ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
          return (
            <Wrap key={p}>
              <div
                className={cn(
                  "px-3 py-2.5 text-center border-[1.5px] border-ink-1000 rounded-[10px] transition-all",
                  active && "bg-ink-1000",
                  !active && done && "bg-cream-50",
                  !active && !done && "bg-cream-50 hover:bg-cream-100"
                )}
              >
                <div
                  className={cn(
                    "text-[10px] font-extrabold tracking-[0.16em]",
                    active ? "text-koki-500" : "text-ink-1000/70"
                  )}
                >
                  {m.num}
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-[13px] font-black tracking-tight",
                    active ? "text-koki-500" : "text-ink-1000"
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
