/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── CRISPR-Guard Custom Palette ──────────────────────────────────
        cream: {
          DEFAULT: "#FFFCE1",
          50: "#FFFEF5",
          100: "#FFFCE1",
          200: "#FFF8C2",
        },
        forest: {
          DEFAULT: "#2C5745",
          50: "#EAF2EE",
          100: "#C5DECE",
          200: "#8FBDA4",
          300: "#599D7A",
          400: "#3D7560",
          500: "#2C5745",
          600: "#204030",
          700: "#14291F",
        },
        mint: {
          DEFAULT: "#E8F5E9",
          50: "#F4FAF4",
          100: "#E8F5E9",
          200: "#C8E6C9",
          300: "#A5D6A7",
        },
        sage: {
          DEFAULT: "#A5D6A7",
          light: "#C8E6C9",
          dark: "#66BB6A",
        },
        peach: {
          DEFAULT: "#FFBE91",
          light: "#FFD9B8",
          dark: "#FF9D5C",
        },
        butter: {
          DEFAULT: "#FFF4BF",
          light: "#FFFADF",
          dark: "#FFE566",
        },
        skyblue: {
          DEFAULT: "#CFEBFF",
          light: "#E8F5FF",
          dark: "#A0D4FF",
        },
        amber: {
          warn: "#EB7D00",
          light: "#FFDDB0",
        },
        crimson: {
          DEFAULT: "#8B2626",
          light: "#F5DEDE",
          50: "#FFF0F0",
          100: "#FFD6D6",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 8px 0 rgba(44,87,69,0.08), 0 1px 3px 0 rgba(44,87,69,0.04)",
        "card-hover": "0 8px 24px 0 rgba(44,87,69,0.12), 0 2px 8px 0 rgba(44,87,69,0.06)",
        gauge: "0 4px 20px 0 rgba(44,87,69,0.15)",
        crimson: "0 0 12px 3px rgba(139,38,38,0.25)",
        sage: "0 0 10px 2px rgba(165,214,167,0.4)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "glow-crimson": "glowCrimson 2s ease-in-out infinite alternate",
        "glow-sage": "glowSage 2s ease-in-out infinite alternate",
        "spin-slow": "spin 3s linear infinite",
        "draw-circle": "drawCircle 1.2s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowCrimson: {
          "0%": { boxShadow: "0 0 6px 2px rgba(139,38,38,0.3)" },
          "100%": { boxShadow: "0 0 16px 6px rgba(139,38,38,0.6)" },
        },
        glowSage: {
          "0%": { boxShadow: "0 0 6px 2px rgba(165,214,167,0.3)" },
          "100%": { boxShadow: "0 0 16px 6px rgba(165,214,167,0.6)" },
        },
        drawCircle: {
          "0%": { strokeDashoffset: "282" },
          "100%": { strokeDashoffset: "var(--dash-offset)" },
        },
      },
      backgroundImage: {
        "gradient-cream": "linear-gradient(135deg, #FFFCE1 0%, #E8F5E9 100%)",
        "gradient-forest": "linear-gradient(135deg, #2C5745 0%, #3D7560 100%)",
        "gradient-sage": "linear-gradient(135deg, #A5D6A7 0%, #C8E6C9 100%)",
      },
    },
  },
  plugins: [],
};
