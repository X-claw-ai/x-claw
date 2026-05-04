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
  const tones: Record<string, string> = {
    neutral: "border-ink-1000 text-ink-1000 bg-cream-50",
    live: "border-ink-1000 text-koki-500 bg-ink-1000",
    soon: "border-ink-1000 text-ink-1000 bg-cream-100",
    mock: "border-ink-1000 text-ink-1000 bg-koki-100",
    danger: "border-ink-1000 text-cream-50 bg-ink-1000",
    info: "border-ink-1000 text-ink-1000 bg-cream-50",
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
