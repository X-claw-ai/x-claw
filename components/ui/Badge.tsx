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
    neutral: "border-white/10 text-zinc-300 bg-white/[0.02]",
    live: "border-koki-500/35 text-koki-300 bg-koki-500/10",
    soon: "border-plum-500/30 text-plum-400 bg-plum-500/10",
    mock: "border-amber-400/25 text-amber-300 bg-amber-400/[0.06]",
    danger: "border-red-500/30 text-red-300 bg-red-500/10",
    info: "border-sea-500/30 text-sea-400 bg-sea-500/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 h-[22px] text-[11px] uppercase tracking-[0.04em] font-medium leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
