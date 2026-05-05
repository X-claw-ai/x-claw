import { ImageResponse } from "next/og";

// iOS home-screen icon (Apple touch icon).
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#E55B14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 32 32" width="120" height="120">
          <ellipse cx="16" cy="22" rx="7.5" ry="6" fill="#0B0B0B" />
          <ellipse cx="6.5" cy="13" rx="2.6" ry="3.2" fill="#0B0B0B" />
          <ellipse cx="11.5" cy="8.5" rx="2.6" ry="3.2" fill="#0B0B0B" />
          <ellipse cx="20.5" cy="8.5" rx="2.6" ry="3.2" fill="#0B0B0B" />
          <ellipse cx="25.5" cy="13" rx="2.6" ry="3.2" fill="#0B0B0B" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
