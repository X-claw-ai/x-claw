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
        // Apple-style: SF Pro / Inter for headlines, geometric for numbers.
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
        // ── Surface (Linear/Stripe-grade dark) ────────────────────────────
        ink: {
          1000: "#04060B",
          950: "#070A12",
          900: "#0B0F1A",
          800: "#10162A",
          700: "#161D34",
          600: "#1E2641",
          500: "#2A3354",
        },
        // ── Brand accent (claw — refined, not neon) ─────────────────────
        claw: {
          50: "#E9FBF2",
          100: "#C7F3DC",
          200: "#9CE9C2",
          300: "#6CDDA3",
          400: "#3FCF87",
          500: "#1FBE6E",
          600: "#16A05A",
          700: "#137F47",
          800: "#0F6539",
          900: "#0B4A2A",
        },
        // ── Coinbase-style cool blue for data/info ────────────────────────
        sea: {
          400: "#5BA9FF",
          500: "#3B8FFA",
          600: "#2C72D8",
        },
        // ── Plum (subtle accent for badges) ───────────────────────────────
        plum: {
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
      },
      boxShadow: {
        // Subtle, layered — Apple-grade
        "elev-1":
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)",
        "elev-2":
          "0 1px 0 rgba(255,255,255,0.05) inset, 0 8px 24px -10px rgba(0,0,0,0.5)",
        "elev-3":
          "0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 48px -16px rgba(0,0,0,0.6)",
        glow: "0 8px 30px -8px rgba(31,190,110,0.35)",
        "glow-sea": "0 8px 30px -8px rgba(59,143,250,0.35)",
      },
      backgroundImage: {
        "radial-soft":
          "radial-gradient(60% 50% at 50% 0%, rgba(31,190,110,0.10) 0%, rgba(7,10,18,0) 70%)",
        "radial-cool":
          "radial-gradient(60% 60% at 90% 10%, rgba(59,143,250,0.08) 0%, rgba(7,10,18,0) 60%)",
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
      },
      animation: {
        "fade-in-up": "fade-in-up 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 800ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
