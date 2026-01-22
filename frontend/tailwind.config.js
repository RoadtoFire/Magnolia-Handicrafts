/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        sway: {
          '0%, 100%': { transform: 'rotate(-5deg)' },
          '50%': { transform: 'rotate(5deg)' },
        }
      },
      animation: {
        sway: 'sway 4s ease-in-out infinite',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'], // Adds a nice serif font for the brand
      }
    },
  },
  plugins: [],
}