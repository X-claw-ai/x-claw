import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const ring =
    tone === "good"
      ? "ring-koki-500/20"
      : tone === "warn"
      ? "ring-amber-300/20"
      : "ring-white/5";
  return (
    <div className={cn("card p-5 ring-1", ring)}>
      <div className="text-[11px] uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}
