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
        // ── Semantic tokens ─────────────────────────────────────────────
        // Mirror the CSS variables in globals.css so Tailwind classes stay
        // in sync with hover/focus rules defined there. Prefer these for
        // new code; the legacy palettes below are kept so class names
        // like `bg-cream-50`, `text-ink-1000`, `bg-koki-500` still compile
        // — they resolve to the monochrome light-theme equivalents.
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

        // ── Ink palette — remapped to monochrome light theme. ───────────
        // `ink-1000` used to be the deepest dark (page bg during the dark
        // era). We now map it back to near-black text so `text-ink-1000`
        // legibly appears on the new white canvas. `ink-300` (was primary
        // text on dark bg) now resolves to a dark near-black so the
        // migrated components stay readable.
        ink: {
          1000: "#0F1114", // text primary (near-black)
          950:  "#14181D",
          900:  "#1F242B", // charcoal accents
          800:  "#2E353F",
          700:  "#3B4149",
          600:  "#4B535E",
          500:  "#5A6472", // text muted
          400:  "#8892A0", // text subtle
          300:  "#0F1114", // WAS "primary text on dark bg" → remapped to near-black
          200:  "#F0F2F4",
          100:  "#F6F7F8", // hover surface
          50:   "#FFFFFF", // page bg
        },
        // ── HAMR accent — REMAPPED from orange to graphite. Any component
        //    that reads `bg-koki-500` now paints charcoal instead of
        //    orange; the semantic slot ("brand accent") stays intact.
        koki: {
          50:  "#F5F6F7",
          100: "#E7E9EC",
          200: "#C7CCD3",
          300: "#9BA3AD",
          400: "#6A7480",
          500: "#2E353F", // primary accent (was #E55B14)
          600: "#22282F",
          700: "#181C22",
          800: "#0F1216",
          900: "#08090B",
        },
        // ── Legacy alias for any lingering `claw-*` classes. Same scale
        //    as `koki` above so both render as charcoal grays.
        claw: {
          50:  "#F5F6F7",
          100: "#E7E9EC",
          200: "#C7CCD3",
          300: "#9BA3AD",
          400: "#6A7480",
          500: "#2E353F",
          600: "#22282F",
          700: "#181C22",
          800: "#0F1216",
          900: "#08090B",
        },
        // ── Cream — REMAPPED to white / light-gray surfaces. Anywhere
        //    components used `bg-cream-50` for "card surface" now correctly
        //    gets pure white on the new light theme.
        cream: {
          50:  "#FFFFFF",  // primary card surface
          100: "#F6F7F8",  // hover / nested panel
          200: "#F0F2F4",  // warmer light variant
        },
        // ── Cool blue — kept intact for occasional data/info accents. ──
        sea: {
          400: "#5BA9FF",
          500: "#3B8FFA",
          600: "#2C72D8",
        },
      },
      boxShadow: {
        "elev-1":
          "0 1px 0 rgba(15,17,20,0.04) inset, 0 1px 2px rgba(15,17,20,0.06)",
        "elev-2":
          "0 1px 0 rgba(15,17,20,0.05) inset, 0 8px 24px -10px rgba(15,17,20,0.12)",
        "elev-3":
          "0 1px 0 rgba(15,17,20,0.06) inset, 0 24px 48px -16px rgba(15,17,20,0.18)",
        glow:
          "0 8px 30px -8px rgba(46,53,63,0.25)",
        "glow-sea":
          "0 8px 30px -8px rgba(59,143,250,0.25)",
      },
      backgroundImage: {
        "radial-soft":
          "radial-gradient(60% 50% at 50% 0%, rgba(46,53,63,0.06) 0%, rgba(255,255,255,0) 70%)",
        "radial-cool":
          "radial-gradient(60% 60% at 90% 10%, rgba(59,143,250,0.06) 0%, rgba(255,255,255,0) 60%)",
        "border-fade":
          "linear-gradient(180deg, rgba(15,17,20,0.06), rgba(15,17,20,0.02))",
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
