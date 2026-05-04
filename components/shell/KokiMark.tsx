import { cn } from "@/lib/cn";

/**
 * KOKi paw mark — used as the brand logo across the app.
 * Designed to read at small sizes (16–32px). Black-on-orange by default;
 * pass `inverted` for orange-on-black.
 */
export function KokiMark({
  size = 28,
  inverted = false,
  className,
}: {
  size?: number;
  inverted?: boolean;
  className?: string;
}) {
  const bg = inverted ? "bg-ink-1000" : "bg-koki-500";
  const fg = inverted ? "text-koki-500" : "text-ink-1000";
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-md",
        bg,
        className
      )}
      style={{ width: size, height: size }}
      aria-label="KOKi"
    >
      <svg
        viewBox="0 0 32 32"
        className={cn("h-3/5 w-3/5", fg)}
        fill="currentColor"
        aria-hidden
      >
        {/* Main pad */}
        <ellipse cx="16" cy="22" rx="7.5" ry="6" />
        {/* Toes (4) */}
        <ellipse cx="6.5" cy="13" rx="2.6" ry="3.2" />
        <ellipse cx="11.5" cy="8.5" rx="2.6" ry="3.2" />
        <ellipse cx="20.5" cy="8.5" rx="2.6" ry="3.2" />
        <ellipse cx="25.5" cy="13" rx="2.6" ry="3.2" />
      </svg>
    </span>
  );
}
