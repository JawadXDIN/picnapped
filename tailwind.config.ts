/** @type {import("tailwindcss").Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./src/**/*.html"],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#7C3AED",
          "purple-light": "#A78BFA",
          blue: "#3B82F6",
          "blue-electric": "#00D4FF",
          dark: "#0F0F1A",
          "dark-card": "#1A1A2E",
          "dark-border": "#2D2D44",
          "dark-muted": "#6B6B8A",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
