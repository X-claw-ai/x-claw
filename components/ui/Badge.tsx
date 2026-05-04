import { cn } from "@/lib/cn";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "live" | "soon" | "mock" | "danger";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/5 text-zinc-300 border-white/10",
    live: "bg-claw-500/10 text-claw-400 border-claw-500/30",
    soon: "bg-glow-violet/10 text-glow-violet border-glow-violet/30",
    mock: "bg-amber-400/10 text-amber-300 border-amber-300/30",
    danger: "bg-red-500/10 text-red-300 border-red-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
