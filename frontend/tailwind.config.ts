// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#7c70b4",     // primary brand blue
        accent: "#FFD100",    // yellow accent
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"], // clean modern font, or update if you know the real one
      },
    },
  },
  plugins: [],
}
export default config;
