import { ImageResponse } from "next/og";

// Social-share preview image for koki.ai. Renders at 1200×630, the
// canonical Open Graph size used by X (Twitter), Discord, Telegram,
// Slack, and most messengers. Next.js auto-discovers this file and
// emits <meta property="og:image"> + <meta name="twitter:image">.

export const runtime = "edge";
export const alt = "KOKi.ai, Grok native meme coin launch agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#E55B14",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#0B0B0B",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Top, wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              letterSpacing: "-3px",
              lineHeight: 1,
              color: "#0B0B0B",
              display: "flex",
              alignItems: "center",
            }}
          >
            koki
            <span style={{ color: "#0B0B0B" }}>.ai</span>
            {/* Tiny paw on the i */}
            <svg
              width="48"
              height="48"
              viewBox="0 0 32 32"
              style={{ marginLeft: -16, marginTop: -42 }}
            >
              <ellipse cx="16" cy="22" rx="7.5" ry="6" fill="#FFFFFF" stroke="#0B0B0B" strokeWidth="2" />
              <ellipse cx="6.5" cy="13" rx="2.6" ry="3.2" fill="#FFFFFF" stroke="#0B0B0B" strokeWidth="2" />
              <ellipse cx="11.5" cy="8.5" rx="2.6" ry="3.2" fill="#FFFFFF" stroke="#0B0B0B" strokeWidth="2" />
              <ellipse cx="20.5" cy="8.5" rx="2.6" ry="3.2" fill="#FFFFFF" stroke="#0B0B0B" strokeWidth="2" />
              <ellipse cx="25.5" cy="13" rx="2.6" ry="3.2" fill="#FFFFFF" stroke="#0B0B0B" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Middle, headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              letterSpacing: "-4px",
              lineHeight: 0.95,
              color: "#0B0B0B",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div>Detect. Analyze.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  background: "#0B0B0B",
                  color: "#E55B14",
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
              color: "#0B0B0B",
              opacity: 0.78,
              maxWidth: 900,
              display: "flex",
            }}
          >
            Grok native meme coin launch agent. From X native meme to Pump.fun in one signature.
          </div>
        </div>

        {/* Bottom, chips */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            color: "#0B0B0B",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          {["DETECT", "ANALYZE", "GENERATE", "LAUNCH", "MONITOR"].map((c) => (
            <div
              key={c}
              style={{
                display: "flex",
                background: "#FFF7ED",
                color: "#0B0B0B",
                padding: "8px 16px",
                borderRadius: 999,
                border: "2px solid #0B0B0B",
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
