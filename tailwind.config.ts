import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 値は globals.css の CSS 変数で定義し、ライト/ダークで切り替える。
        // 不透明度修飾子（例: bg-brand-primary/30）を効かせるため rgb チャンネル形式。
        brand: {
          primary: "rgb(var(--brand-primary) / <alpha-value>)",
          accent: "rgb(var(--brand-accent) / <alpha-value>)",
          bg: "rgb(var(--brand-bg) / <alpha-value>)",
          surface: "rgb(var(--brand-surface) / <alpha-value>)",
          text: "rgb(var(--brand-text) / <alpha-value>)",
          muted: "rgb(var(--brand-muted) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto)", "Hiragino Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
