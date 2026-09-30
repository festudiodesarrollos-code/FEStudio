/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
          accent: '#10b981', 
          cyan: '#06b6d4',   
          amber: '#f59e0b',  
          text: '#f3f4f6'
        }
      }
    }
  },
  plugins: [],
}