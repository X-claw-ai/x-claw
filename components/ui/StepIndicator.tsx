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
              "flex items-center gap-2 rounded-[10px] px-3 py-2 border-[1.5px] whitespace-nowrap",
              active
                ? "border-ink-1000 bg-ink-1000 text-koki-500"
                : done
                ? "border-ink-1000 bg-cream-50 text-ink-1000"
                : "border-ink-1000/30 bg-cream-50/60 text-ink-1000/55"
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] font-extrabold",
                active
                  ? "bg-koki-500 text-ink-1000"
                  : done
                  ? "bg-ink-1000 text-koki-500"
                  : "bg-cream-100 text-ink-1000/55"
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className="text-xs font-extrabold">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
