/**
 * HAMR.fun brand lockup — glass hammer icon + wordmark.
 *
 *   • gray/steel canvas — matches the site background
 *   • hammer icon sourced from /public/hamr-logo.jpg
 *   • "hamr.fun" lowercase wordmark, heavy geometric sans
 *
 * This is the canonical mark. Don't restyle it — it's the brand.
 *
 * Render contexts:
 *   <KokiLogo height={36} className="rounded-md overflow-hidden" />
 *     // standard header lockup — hammer + wordmark, sized to fit the navbar
 *   <KokiLogo height={48} bare />
 *     // skip the outer tile background when the parent surface already
 *     // provides one (e.g. embedded inside a colored panel).
 *
 * The component name stays "KokiLogo" for now so the ~60 existing import
 * sites don't need to be touched — a follow-up cleanup can rename it to
 * `HamrLogo` once the rebrand settles.
 */
import Image from "next/image";
import { Silkscreen } from "next/font/google";

// Pixel wordmark — retro terminal bitmap look.
const pixel = Silkscreen({ weight: "400", subsets: ["latin"] });

export default function KokiLogo({
  height = 32,
  // `bare` is kept in the signature for backward compatibility with the
  // ~5 call sites that still pass it, but the tile background is now
  // always off — the wordmark and icon float directly on whatever
  // surface the parent provides.
  bare: _bare = false,
  className,
}: {
  height?: number;
  bare?: boolean;
  className?: string;
}) {
  void _bare;
  const iconSize = height;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.round(height * 0.2),
        height,
        color: "var(--text)",
        letterSpacing: "0.02em",
      }}
      role="img"
      aria-label="hamr.fun"
    >
      <Image
        src="/hamr-logo.png"
        alt=""
        width={iconSize}
        height={iconSize}
        priority
        style={{
          height: iconSize,
          width: iconSize,
          objectFit: "contain",
        }}
      />
      <span
        className={pixel.className}
        style={{ fontSize: Math.round(height * 0.52), lineHeight: 1 }}
      >
        HAMR<span style={{ opacity: 0.6 }}>.FUN</span>
      </span>
    </span>
  );
}
