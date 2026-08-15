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

export default function KokiLogo({
  height = 32,
  bare = false,
  className,
}: {
  height?: number;
  /** Skip the outer tile background (parent already provides one). */
  bare?: boolean;
  className?: string;
}) {
  // Lockup is roughly icon + wordmark ≈ 4.2 : 1
  const width = Math.round(height * 4.2);
  const iconSize = height;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.round(height * 0.2),
        width,
        height,
        background: bare ? "transparent" : "#1E2530",
        padding: bare ? 0 : `0 ${Math.round(height * 0.25)}px`,
        color: "#E7EDF3",
        fontFamily:
          "'Inter','Manrope','Hanken Grotesk',-apple-system,'SF Pro Display',system-ui,sans-serif",
        fontWeight: 900,
        letterSpacing: "-0.03em",
      }}
      role="img"
      aria-label="hamr.fun"
    >
      <Image
        src="/hamr-logo.jpg"
        alt=""
        width={iconSize}
        height={iconSize}
        priority
        style={{
          height: iconSize,
          width: iconSize,
          borderRadius: Math.round(iconSize * 0.18),
          objectFit: "cover",
          background: "#F4F6F8",
        }}
      />
      <span style={{ fontSize: Math.round(height * 0.55), lineHeight: 1 }}>
        hamr<span style={{ opacity: 0.72 }}>.fun</span>
      </span>
    </span>
  );
}
