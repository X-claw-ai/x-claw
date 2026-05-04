import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function StepIndicator({
  steps,
  current,
}: {
  steps: { label: string; sub?: string }[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={s.label}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 border whitespace-nowrap",
              active
                ? "border-claw-500/50 bg-claw-500/10 text-claw-400"
                : done
                ? "border-white/10 bg-white/5 text-zinc-300"
                : "border-white/10 bg-transparent text-zinc-500"
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold",
                active
                  ? "bg-claw-500 text-ink-950"
                  : done
                  ? "bg-white/10 text-zinc-200"
                  : "bg-white/5 text-zinc-500"
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className="text-xs font-medium">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
