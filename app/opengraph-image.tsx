import { ImageResponse } from "next/og";

// Social-share preview image for hamr.fun. Renders at 1200×630, the
// canonical Open Graph size used by X (Twitter), Discord, Telegram,
// Slack, and most messengers. Next.js auto-discovers this file and
// emits <meta property="og:image"> + <meta name="twitter:image">.
//
// White canvas + charcoal type matches the site's monochrome theme.

export const runtime = "edge";
export const alt = "HAMR.fun, autonomous meme coin launch agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#0F1114",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Top — wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 80,
            fontWeight: 900,
            letterSpacing: "-3px",
            lineHeight: 1,
            color: "#0F1114",
          }}
        >
          <span>hamr</span>
          <span style={{ color: "#0F1114", opacity: 0.55 }}>.fun</span>
        </div>

        {/* Middle — headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              letterSpacing: "-4px",
              lineHeight: 0.95,
              color: "#0F1114",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div>Detect. Analyze.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  background: "#2E353F",
                  color: "#FFFFFF",
                  padding: "0 24px",
                  borderRadius: 12,
                  display: "flex",
                  transform: "rotate(-2deg)",
                }}
              >
                Launch.
              </span>
              <span>Repeat.</span>
            </div>
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#4B535E",
              maxWidth: 900,
              display: "flex",
            }}
          >
            Autonomous meme coin launch agent. From X meme to Pons on
            Robinhood Chain in one signature.
          </div>
        </div>

        {/* Bottom — chips */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            color: "#0F1114",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          {["DETECT", "ANALYZE", "GENERATE", "LAUNCH", "MONITOR"].map((c) => (
            <div
              key={c}
              style={{
                display: "flex",
                background: "#F6F7F8",
                color: "#0F1114",
                padding: "8px 16px",
                borderRadius: 999,
                border: "2px solid #0F1114",
                letterSpacing: "1px",
              }}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
