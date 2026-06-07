import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b12",
        panel: "#141422",
        primary: "#6366f1"
      },
      boxShadow: {
        glow: "0 20px 80px rgba(99, 102, 241, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
