/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0e131f',
          card: '#161d2f',
          accent: '#10b981', // Neon/Green
          cyan: '#06b6d4',   // Tech Cyan
          amber: '#f59e0b',  // Glow Accent
          text: '#f3f4f6'
        }
      }
    }
  },
  plugins: [],
}