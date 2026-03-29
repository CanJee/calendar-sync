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
        free: "#22c55e",
        busy: "#ef4444",
        driver: "#f59e0b",
        booked: "#3b82f6",
      },
    },
  },
  plugins: [],
};

export default config;
