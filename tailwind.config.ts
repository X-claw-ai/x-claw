import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "Inter",
          "-apple-system",
          "SF Pro Display",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "ui-monospace",
          "Menlo",
          "monospace",
        ],
      },
      letterSpacing: {
        tightest: "-0.04em",
        "extra-tight": "-0.025em",
      },
      colors: {
        // ── Ink (true black tones) ──────────────────────────────────────
        ink: {
          1000: "#0B0B0B", // brand black (logo paw + headlines)
          950: "#1A0A04",
          900: "#2A1408",
          800: "#3A1F0F",
          700: "#4A2A18",
          600: "#5C3520",
          500: "#6E4029",
        },
        // ── KOKi orange (brand primary — Shiba-energy tangerine) ────────
        koki: {
          50: "#FFF4ED",
          100: "#FFE0CB",
          200: "#FFC195",
          300: "#FF9D5C",
          400: "#FF7A2E",
          500: "#E55B14",   // logo color
          600: "#BF4710",
          700: "#97380E",
          800: "#6F2A0B",
          900: "#4A1C07",
        },
        // ── Legacy alias so any lingering "claw-*" classes still render
        // (mirrors KOKi orange). Prefer `koki-*` going forward.
        claw: {
          50: "#FFF4ED",
          100: "#FFE0CB",
          200: "#FFC195",
          300: "#FF9D5C",
          400: "#FF7A2E",
          500: "#E55B14",
          600: "#BF4710",
          700: "#97380E",
          800: "#6F2A0B",
          900: "#4A1C07",
        },
        // ── Cream (Shiba face inner / soft surface) ─────────────────────
        cream: {
          50: "#FFF7ED",
          100: "#FFEED4",
          200: "#FFE0B0",
        },
        // ── Cool blue for data/info accents ─────────────────────────────
        sea: {
          400: "#5BA9FF",
          500: "#3B8FFA",
          600: "#2C72D8",
        },
      },
      boxShadow: {
        "elev-1":
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)",
        "elev-2":
          "0 1px 0 rgba(255,255,255,0.05) inset, 0 8px 24px -10px rgba(0,0,0,0.5)",
        "elev-3":
          "0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 48px -16px rgba(0,0,0,0.6)",
        glow:
          "0 8px 30px -8px rgba(229,91,20,0.45)",
        "glow-sea":
          "0 8px 30px -8px rgba(59,143,250,0.35)",
      },
      backgroundImage: {
        "radial-soft":
          "radial-gradient(60% 50% at 50% 0%, rgba(229,91,20,0.14) 0%, rgba(7,10,18,0) 70%)",
        "radial-cool":
          "radial-gradient(60% 60% at 90% 10%, rgba(59,143,250,0.07) 0%, rgba(7,10,18,0) 60%)",
        "border-fade":
          "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "wag": {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 800ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "wag": "wag 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
