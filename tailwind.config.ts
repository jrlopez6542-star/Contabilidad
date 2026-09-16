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
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "#0b3d2e",
          dark: "#07291f",
          light: "#145a44",
          50: "#e8f5f0",
          100: "#d1ebe0",
          200: "#a3d7c1",
          700: "#0b3d2e",
          800: "#07291f",
          900: "#041a14",
        },
        cream: {
          DEFAULT: "#fff8e7",
          muted: "#faf6eb",
        },
        gold: {
          DEFAULT: "#d97706",
          light: "#f59e0b",
          50: "#fffbeb",
          100: "#fef3c7",
        },
        jam: {
          DEFAULT: "#c41e3a",
          light: "#e11d48",
          50: "#fef2f2",
          100: "#fee2e2",
        },
      },
    },
  },
  plugins: [],
};
export default config;
