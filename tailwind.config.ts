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
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "sans-serif",
        ],
        mono: ["ui-monospace", "JetBrains Mono", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          950: "#05060A",
          900: "#0A0B12",
          800: "#0F1118",
          700: "#161924",
          600: "#1F2330",
          500: "#2A2F3E",
        },
        claw: {
          // Neon accent — pick a confident brand neon
          400: "#7CF7C0",
          500: "#34E89E",
          600: "#0DC97F",
        },
        glow: {
          violet: "#8C5CFF",
          cyan: "#22D3EE",
          pink: "#FF5CE0",
        },
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(124,247,192,0.25), 0 8px 40px -10px rgba(52,232,158,0.35)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(60% 60% at 50% 0%, rgba(52,232,158,0.18) 0%, rgba(5,6,10,0) 60%)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 600ms ease-out both",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
