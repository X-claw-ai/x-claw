import { ImageResponse } from "next/og";

// iOS home-screen icon (Apple touch icon). Larger glass-hammer glyph,
// same silhouette as /icon so the tab favicon and home-screen icon
// read as the same brand mark.

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
          background: "#F6F7F8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
        }}
      >
        <svg viewBox="0 0 32 32" width="130" height="130">
          <rect
            x="13.5"
            y="12"
            width="5"
            height="17"
            rx="1.6"
            fill="#7CC7A5"
            stroke="#0F1114"
            strokeWidth="1.2"
          />
          <path
            d="M6 6.5
               C7.6 5.2 10 4.8 12.6 5.4
               L23.5 5.4
               C24.7 5.4 25.8 5.9 26.4 6.8
               L26.4 12.4
               C25.8 13.3 24.7 13.8 23.5 13.8
               L12.6 13.8
               C10 14.4 7.6 14.0 6 12.7 Z"
            fill="#E9EDF2"
            stroke="#0F1114"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M6 6.5
               C4 7.4 3.5 9 3.7 9.7
               C4 10.4 4.6 10.6 5.4 10.4"
            fill="none"
            stroke="#0F1114"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <rect
            x="22"
            y="7.4"
            width="4"
            height="4.2"
            rx="0.6"
            fill="#E9EDF2"
            stroke="#0F1114"
            strokeWidth="1.2"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
