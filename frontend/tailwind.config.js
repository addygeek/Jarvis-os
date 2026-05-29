/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: "#0a0c0f",
          surface: "#12151a",
          elevated: "#1a1f27",
          border: "#2a313c",
          muted: "#6b7280",
          text: "#e8eaed",
          subtle: "#9ca3af",
          accent: "#22d3ee",
          "accent-dim": "#0891b2",
          success: "#34d399",
          warning: "#fbbf24",
          danger: "#f87171",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Helvetica Neue",
          "system-ui",
          "sans-serif",
        ],
        mono: ["SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4)",
        glow: "0 0 24px rgba(34, 211, 238, 0.15)",
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
