import { ImageResponse } from "next/og";

// Browser-tab favicon — flat glass-hammer glyph on a light rounded tile.
// Next.js auto-emits at /icon and adds <link rel="icon"> to <head>.
//
// SVG shape mirrors the /public/hamr-logo.jpg silhouette so the tab
// icon and the header lockup read as the same brand mark.

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
        }}
      >
        {/* Glass hammer — mint handle, steel head, dark outline. */}
        <svg viewBox="0 0 32 32" width="46" height="46">
          {/* Handle */}
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
          {/* Head */}
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
          {/* Claw hook */}
          <path
            d="M6 6.5
               C4 7.4 3.5 9 3.7 9.7
               C4 10.4 4.6 10.6 5.4 10.4"
            fill="none"
            stroke="#0F1114"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Head-handle collar */}
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
