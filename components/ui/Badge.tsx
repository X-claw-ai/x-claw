import { cn } from "@/lib/cn";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "live" | "soon" | "mock" | "danger" | "info";
  className?: string;
}) {
  // Dark-mode tones. Borders use the subtle hairline; live/danger use the
  // orange accent; neutral/soon/info ride on the surface scale.
  const tones: Record<string, string> = {
    neutral: "border-[var(--border)] text-ink-300 bg-cream-50",
    live: "border-koki-500 text-koki-500 bg-koki-500/10",
    soon: "border-[var(--border)] text-ink-400 bg-cream-100",
    mock: "border-koki-500/40 text-koki-400 bg-koki-500/10",
    danger: "border-koki-500 text-koki-500 bg-koki-500/10",
    info: "border-[var(--border)] text-ink-300 bg-cream-50",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-[1.5px] px-2.5 h-[22px] text-[11px] uppercase tracking-[0.06em] font-extrabold leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
