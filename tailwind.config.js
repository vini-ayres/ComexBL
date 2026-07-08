/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1B3153",
          50: "#EBEFF4",
          100: "#D2DAE5",
          200: "#A6B6CC",
          300: "#7991B2",
          400: "#4D6D99",
          500: "#2F5280",
          600: "#254166",
          700: "#1B3153",
          800: "#12213A",
          900: "#0A1220",
          950: "#050A14",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#EA8022",
          50: "#FDF2E8",
          100: "#FBE2C6",
          200: "#F7C58D",
          300: "#F3A855",
          400: "#EF9439",
          500: "#EA8022",
          600: "#C7671A",
          700: "#9C5115",
          800: "#713B0F",
          900: "#46250A",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        success: {
          DEFAULT: "#16A34A",
          50: "#EFFDF4",
          100: "#D8FBE4",
          600: "#16A34A",
          700: "#15803D",
        },
        warning: {
          DEFAULT: "#EAB308",
          50: "#FEFCE8",
          100: "#FEF9C3",
          600: "#CA8A04",
          700: "#A16207",
        },
        danger: {
          DEFAULT: "#DC2626",
          50: "#FEF2F2",
          100: "#FEE2E2",
          600: "#DC2626",
          700: "#B91C1C",
        },
        info: {
          DEFAULT: "#2563EB",
          50: "#EFF6FF",
          100: "#DBEAFE",
          600: "#2563EB",
          700: "#1D4ED8",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },
      fontFamily: {
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(27 49 83 / 0.08), 0 1px 2px -1px rgb(27 49 83 / 0.08)",
        soft: "0 4px 16px -4px rgb(27 49 83 / 0.12)",
        elevated: "0 8px 30px -8px rgb(27 49 83 / 0.20)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-dot": "pulse-dot 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
