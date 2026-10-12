/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/hooks/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // royal blue brand scale (buttons, links, headers)
        brand: {
          50: "#eef4ff",
          100: "#dce7fe",
          200: "#bacffd",
          300: "#8cb0fa",
          400: "#5b8def",
          500: "#3a6fe6",
          600: "#2a5bdb",
          700: "#2349b5",
          800: "#1f3d8f",
          900: "#1e3672",
          950: "#142250",
        },
        primary: {
          DEFAULT: "#2a5bdb",
          50: "#eef4ff",
          100: "#dce7fe",
          200: "#bacffd",
          300: "#8cb0fa",
          400: "#5b8def",
          500: "#3a6fe6",
          600: "#2a5bdb",
          700: "#2349b5",
          800: "#1f3d8f",
          900: "#1e3672",
        },
        secondary: "#1e3672",
        // fresh green call-to-action ("Buy" style buttons)
        accent: {
          DEFAULT: "#3ddc97",
          dark: "#22b573",
        },
      },
      fontFamily: {
        display: ["Rubik", "Noto Sans Sinhala", "sans-serif"],
        sans: ["Rubik", "Noto Sans Sinhala", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1.125rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        // soft blue-tinted shadows
        card: "0 8px 24px -8px rgba(42,91,219,0.14)",
        "card-hover": "0 14px 32px -10px rgba(42,91,219,0.22)",
        elevated: "0 18px 40px -12px rgba(42,91,219,0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
