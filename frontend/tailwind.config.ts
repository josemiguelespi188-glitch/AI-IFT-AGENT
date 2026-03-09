import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:   "#0f1628",
          dark:   "#141d35",
          card:   "#1a2540",
          border: "#263354",
          accent: "#3b82f6",
          red:    "#ef4444",
          green:  "#22c55e",
          yellow: "#f59e0b",
          muted:  "#64748b",
        },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
