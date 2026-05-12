/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        accent: {
          300: "#FDE047",
          400: "#FACC15",
        },
        /** Teacher workspace — navy, warm gold, paper (avoid generic “AI” purple gradients) */
        teacher: {
          ink: "#0c2340",
          navy: "#0f2d52",
          navyMuted: "#3d5a80",
          paper: "#fdfcf8",
          canvas: "#f0f3f8",
          line: "#e2e8f0",
          gold: "#c9a227",
          goldBright: "#e8b923",
          goldSoft: "#fdf6e3",
          blueWash: "#e8eef6",
        },
        slateSoft: "#F8FAFC",
        /** Figma Teacher DashBoard (file Cds4Q18avrdo8kByuVAM9y, node 1:4) */
        figma: {
          blue: "#1E73D8",
          blueBrand: "#1D4ED8",
          ink: "#1A1C1C",
          muted: "#414753",
          navMuted: "#475569",
          sidebar: "#F8FAFC",
          policyYellow: "#FFDD67",
          policyInk: "#766100",
          cardGray: "#F4F3F3",
          liveBlue: "#005AB3",
        },
        /** Figma Availability Calender (node 6:2) */
        planner: {
          ink: "#0B3C5D",
          border: "#C1C6D5",
          chip: "#F4D35E",
          slotSelected: "#8BBCEB",
          slotText: "#1A1C1C",
          sectionLabel: "#414753",
        },
        /** Weekly calendar /teacher/calendar (Figma node 8:172) */
        calendar: {
          dateSelected: "#EAB308",
          bannerAccent: "#1E73D8",
          openBg: "#EFF6FF",
          openBorder: "#BFDBFE",
          openText: "#1E40AF",
          bookedBg: "#FEF2F2",
          bookedBorder: "#FECACA",
          bookedText: "#991B1B",
          surfaceBorder: "#E5E7EB",
        },
        /** Admin workspace — strict palette (dashboard + shell) */
        admin: {
          primary: "#1E73D8",
          dark: "#0B3C5D",
          light: "#8BBCEB",
          gold: "#F4D35E",
          green: "#25D366",
          white: "#FFFFFF",
          grey: "#F5F5F5",
        },
      },
      fontFamily: {
        heading: ["Montserrat", "sans-serif"],
        body: ["Poppins", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 24px -12px rgba(37, 99, 235, 0.35)",
        teacher: "0 1px 2px rgba(12, 35, 64, 0.06), 0 4px 12px -4px rgba(12, 35, 64, 0.12)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};

