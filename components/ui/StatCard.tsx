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
  const isEmph = tone === "good";
  return (
    <div
      className={cn(
        "card !p-5",
        isEmph && "card-emph"
      )}
    >
      <div
        className={cn(
          "eyebrow !text-[10px] opacity-80",
          isEmph && "text-koki-500"
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-2 text-[28px] font-black tracking-tight",
          isEmph ? "text-koki-500" : "text-ink-1000"
        )}
      >
        {value}
      </div>
      {hint && (
        <div
          className={cn(
            "mt-1 text-[12px] font-bold",
            isEmph ? "text-koki-500/80" : "text-ink-1000/65"
          )}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
