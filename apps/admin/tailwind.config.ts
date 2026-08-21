import type { Config } from "tailwindcss";

/**
 * HSSND Content Factory — Tailwind theme.
 *
 * Color tokens are defined as HSL CSS variables in app/globals.css and
 * referenced here, following the shadcn/ui convention, so a future
 * light-mode or white-label theme only requires changing the variables,
 * never the components.
 *
 * Note: "flow" is used instead of "current" for the blue accent token —
 * Tailwind reserves `current` for the `currentColor` keyword utility
 * (e.g. `text-current`), so reusing that name would create a collision.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "hsl(var(--void))",
        surface: "hsl(var(--surface))",
        paper: "hsl(var(--paper))",
        mist: "hsl(var(--mist))",
        border: "hsl(var(--border))",
        signal: "hsl(var(--signal))",
        flow: "hsl(var(--flow))",
        pulse: "hsl(var(--pulse))",
        amber: "hsl(var(--amber))",
        success: "hsl(var(--success))",
        danger: "hsl(var(--danger))",
      },
      fontFamily: {
        display: [
          '"Space Grotesk"',
          '"Inter"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        "glow-signal": "0 0 28px -6px hsl(var(--signal) / 0.55)",
        "glow-flow": "0 0 28px -6px hsl(var(--flow) / 0.5)",
        "glow-pulse": "0 0 28px -6px hsl(var(--pulse) / 0.55)",
        glass: "0 1px 0 0 hsl(0 0% 100% / 0.05) inset, 0 8px 30px -12px hsl(230 60% 2% / 0.6)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(hsl(var(--border) / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.35) 1px, transparent 1px)",
      },
      keyframes: {
        aurora: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: "0.55" },
          "50%": { transform: "translate3d(2%, -3%, 0) scale(1.08)", opacity: "0.75" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 hsl(var(--signal) / 0.5)" },
          "50%": { opacity: "0.6", boxShadow: "0 0 0 6px hsl(var(--signal) / 0)" },
        },
      },
      animation: {
        aurora: "aurora 18s ease-in-out infinite",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
