import { cn } from "@/lib/cn";

/**
 * KOKi brand mark.
 *
 * Two visual modes:
 *   - default  → BLACK tile + ORANGE wordmark (use ON ORANGE backgrounds)
 *   - inverted → ORANGE tile + BLACK wordmark (use ON BLACK / dark surfaces)
 *
 * Two shape variants:
 *   - "default"  → wordmark "KOKi" + tiny paw accent (full brand mark)
 *   - "paw-only" → just the paw glyph (favicons / tight UI slots)
 */
export function KokiMark({
  size = 32,
  inverted = false,
  variant = "default",
  className,
}: {
  size?: number;
  inverted?: boolean;
  variant?: "default" | "paw-only";
  className?: string;
}) {
  const tileBg = inverted ? "#E55B14" : "#0B0B0B";
  const fg = inverted ? "#0B0B0B" : "#E55B14";

  const isWordmark = variant === "default";
  const width = isWordmark ? size * 1.7 : size;
  const height = size;

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-md overflow-hidden",
        className
      )}
      style={{
        width,
        height,
        backgroundColor: tileBg,
        boxShadow:
          "0 1.5px 0 rgba(255,255,255,0.08) inset, 0 4px 0 -2px rgba(11,11,11,0.55)",
      }}
      aria-label="KOKi"
    >
      {isWordmark ? (
        <svg
          viewBox="0 0 80 50"
          width={width}
          height={height}
          aria-hidden
        >
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={fg}
            fontFamily="'Inter', 'SF Pro Display', system-ui, sans-serif"
            fontWeight={900}
            fontSize="30"
            letterSpacing="-1.5"
          >
            KOKi
          </text>
          <g transform="translate(64,8) scale(0.32)">
            <ellipse cx="16" cy="22" rx="7.5" ry="6" fill={fg} />
            <ellipse cx="6.5" cy="13" rx="2.6" ry="3.2" fill={fg} />
            <ellipse cx="11.5" cy="8.5" rx="2.6" ry="3.2" fill={fg} />
            <ellipse cx="20.5" cy="8.5" rx="2.6" ry="3.2" fill={fg} />
            <ellipse cx="25.5" cy="13" rx="2.6" ry="3.2" fill={fg} />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 32 32" width={size * 0.7} height={size * 0.7} aria-hidden>
          <ellipse cx="16" cy="22" rx="7.5" ry="6" fill={fg} />
          <ellipse cx="6.5" cy="13" rx="2.6" ry="3.2" fill={fg} />
          <ellipse cx="11.5" cy="8.5" rx="2.6" ry="3.2" fill={fg} />
          <ellipse cx="20.5" cy="8.5" rx="2.6" ry="3.2" fill={fg} />
          <ellipse cx="25.5" cy="13" rx="2.6" ry="3.2" fill={fg} />
        </svg>
      )}
    </span>
  );
}
