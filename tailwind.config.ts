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
          "PP Neue Montreal",
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
          "PP Neue Montreal",
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
          // Dark-theme mapping. ink-1000 doubles as "text on accent" and
          // the base for translucent fills (bg-ink-1000/10 = white 10%),
          // so it is near-white. ink-300 is primary body text.
          1000: "#F4F4F8", // text primary / on-accent (near-white)
          950:  "#EDEDF3",
          900:  "#D5D5E0",
          800:  "#B9B9C8",
          700:  "#9C9CAE",
          600:  "#84849A",
          500:  "#6E6E80", // text muted
          400:  "#8B8B9E", // text subtle
          300:  "#EDEDF3", // primary text on dark bg
          200:  "#1B1B26",
          100:  "#16161F", // hover surface
          50:   "#0A0A0F", // page bg
        },
        // ── HAMR accent — REMAPPED from orange to graphite. Any component
        //    that reads `bg-koki-500` now paints charcoal instead of
        //    orange; the semantic slot ("brand accent") stays intact.
        koki: {
          50:  "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6", // primary accent (violet)
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },

        // ── Legacy alias for any lingering `claw-*` classes. Same scale
        //    as `koki` above so both render as charcoal grays.
        claw: {
          50:  "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6", // primary accent (violet)
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },

        // ── Cream — REMAPPED to white / light-gray surfaces. Anywhere
        //    components used `bg-cream-50` for "card surface" now correctly
        //    gets pure white on the new light theme.
        cream: {
          50:  "#14141C",  // primary card surface (dark panel)
          100: "#1B1B26",  // hover / nested panel
          200: "#22222E",  // lighter dark variant
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
          "0 1px 0 rgba(255,255,255,0.03) inset, 0 1px 2px rgba(0,0,0,0.5)",
        "elev-2":
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 28px -10px rgba(0,0,0,0.6)",
        "elev-3":
          "0 1px 0 rgba(255,255,255,0.05) inset, 0 28px 56px -16px rgba(0,0,0,0.7)",
        glow:
          "0 8px 30px -8px rgba(139,92,246,0.45)",
        "glow-sea":
          "0 8px 30px -8px rgba(59,143,250,0.35)",
      },
      backgroundImage: {
        "radial-soft":
          "radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.12) 0%, rgba(10,10,15,0) 70%)",
        "radial-cool":
          "radial-gradient(60% 60% at 90% 10%, rgba(59,143,250,0.08) 0%, rgba(10,10,15,0) 60%)",
        "border-fade":
          "linear-gradient(180deg, rgba(244,244,248,0.08), rgba(244,244,248,0.02))",
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
