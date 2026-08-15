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
        // ── Semantic tokens (preferred for new code) ────────────────────
        // These mirror the CSS variables in globals.css so Tailwind classes
        // stay in sync with hover/focus rules defined there. Reach for
        // these first; the legacy palettes below are kept so existing
        // class names (bg-cream-50, text-ink-1000, etc.) compile cleanly
        // and re-resolve to dark-mode equivalents.
        bg: "var(--bg)",
        "bg-elevated": "var(--bg-elevated)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        up: "var(--up)",
        down: "var(--down)",

        // ── Ink palette — REMAPPED to Binance-dark surface scale. ───────
        // Previously these were dark hex values used for both surfaces
        // AND text on light backgrounds. Now the project is dark-themed,
        // so:
        //   - `bg-ink-1000` (was "deepest dark") still resolves to the
        //     deepest tone — our page bg — so it keeps working.
        //   - `text-ink-1000` (was "primary text on light bg") would now
        //     be near-invisible. Components should migrate to `text-text`
        //     or `text-ink-50` instead. We map the high end of the scale
        //     to the page bg and the LOW end to light text colors, so any
        //     remaining `text-ink-100`-ish usage still produces readable
        //     light text by accident in most cases.
        ink: {
          1000: "#0B0E11", // page bg
          950: "#181A20",
          900: "#1E2329", // card surface
          800: "#252A31",
          700: "#2B3139",
          600: "#454B54",
          500: "#848E9C", // text subtle
          400: "#B7BDC6", // text muted
          300: "#EAECEF", // primary text — new
          200: "#F0F3F5",
          100: "#F5F7FA",
          50:  "#FAFCFE",
        },
        // ── HAMR orange — unchanged. The single warm accent on dark. ────
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
        // (mirrors HAMR orange). Prefer `koki-*` going forward.
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
        // ── Cream — REMAPPED to dark surfaces. Anywhere components used
        //    `bg-cream-50` for "card surface" now correctly gets the dark
        //    card surface. Anywhere `text-cream-50` was used (text on
        //    inverted ink panels) now produces text-near-white on a dark
        //    accent panel — still legible.
        cream: {
          50: "#1E2329",   // primary card surface (was light cream)
          100: "#2B3139",  // hover / nested panel
          200: "#3A4049",  // warmer dark variant
        },
        // ── Cool blue for data/info accents — unchanged. ────────────────
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
