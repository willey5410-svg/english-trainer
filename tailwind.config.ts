import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#2563eb",
          accent: "#f59e0b",
          bg: "#f8fafc",
          surface: "#ffffff",
          text: "#1e293b",
          muted: "#64748b",
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
