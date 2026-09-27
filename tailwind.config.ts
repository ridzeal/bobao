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
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        bg: {
          DEFAULT: "#0d0d0f",
          surface: "#141416",
          elevated: "#1c1c20",
          border: "#27272b",
        },
        txt: {
          DEFAULT: "#e8e8eb",
          muted: "#8b8b99",
          dim: "#56565f",
        },
        green: {
          DEFAULT: "#22c55e",
          dim: "#16a34a20",
          badge: "#16a34a",
        },
        yellow: {
          DEFAULT: "#f59e0b",
          dim: "#d9770620",
          badge: "#b45309",
        },
        gray: {
          DEFAULT: "#6b7280",
          dim: "#37415120",
          badge: "#374151",
        },
        blue: {
          DEFAULT: "#3b82f6",
          dim: "#2563eb20",
        },
        red: {
          DEFAULT: "#ef4444",
          dim: "#dc262620",
        },
      },
    },
  },
  plugins: [],
};

export default config;
