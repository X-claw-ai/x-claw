/**
 * KOKi.ai brand wordmark — pixel-faithful SVG of the official logo.
 *
 *   • orange (#E55B14) tile
 *   • "koki.ai" lowercase, heavy geometric black sans
 *   • white paw print (with black outline) replacing the dot of the "i" in "ai"
 *
 * This is the canonical mark. Don't restyle it — it's the brand.
 *
 * Render contexts:
 *   <KokiLogo height={36} className="rounded-md overflow-hidden" />
 *     // standard — show the orange tile + black wordmark; works on
 *     // any background. After the Binance-dark rebrand, this is the
 *     // ONLY way the logo is legible on the page bg.
 *   <KokiLogo height={48} bare />
 *     // only when the parent surface is ALREADY orange (e.g. an
 *     // orange CTA hero panel). Black wordmark vanishes on dark.
 */
export default function KokiLogo({
  height = 32,
  bare = false,
  className,
}: {
  height?: number;
  /** Skip the orange tile background (parent already provides it). */
  bare?: boolean;
  className?: string;
}) {
  // Aspect ratio of the official lockup ≈ 3.6 : 1
  const width = height * 3.6;

  return (
    <svg
      viewBox="0 0 360 100"
      width={width}
      height={height}
      role="img"
      aria-label="koki.ai"
      className={className}
    >
      {!bare && <rect x="0" y="0" width="360" height="100" fill="#E55B14" />}

      {/* Wordmark — lowercase "koki.ai" in heavy geometric sans, true black */}
      <text
        x="50%"
        y="64%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#0B0B0B"
        fontFamily="'Inter', 'Manrope', 'Hanken Grotesk', -apple-system, 'SF Pro Display', system-ui, sans-serif"
        fontWeight={900}
        fontSize="64"
        letterSpacing="-2"
        style={{ fontVariationSettings: "'wght' 900" }}
      >
        koki.ai
      </text>

      {/* White paw print sitting on top of the "i" in "ai" — replaces the dot */}
      <g transform="translate(258, 18)">
        {/* black outline pad */}
        <ellipse cx="11" cy="14" rx="9" ry="7.2" fill="#0B0B0B" />
        {/* white pad */}
        <ellipse cx="11" cy="14" rx="7.4" ry="5.7" fill="#FFFFFF" />
        {/* toes — outline ring then white fill */}
        <ellipse cx="2" cy="6" rx="3" ry="3.8" fill="#0B0B0B" />
        <ellipse cx="2" cy="6" rx="2" ry="2.8" fill="#FFFFFF" />
        <ellipse cx="7.5" cy="1.4" rx="3" ry="3.8" fill="#0B0B0B" />
        <ellipse cx="7.5" cy="1.4" rx="2" ry="2.8" fill="#FFFFFF" />
        <ellipse cx="14.5" cy="1.4" rx="3" ry="3.8" fill="#0B0B0B" />
        <ellipse cx="14.5" cy="1.4" rx="2" ry="2.8" fill="#FFFFFF" />
        <ellipse cx="20" cy="6" rx="3" ry="3.8" fill="#0B0B0B" />
        <ellipse cx="20" cy="6" rx="2" ry="2.8" fill="#FFFFFF" />
      </g>
    </svg>
  );
}
