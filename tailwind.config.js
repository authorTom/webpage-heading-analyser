/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
   safelist: [ // Add safelist for dynamic padding classes used in results
    'pl-0',
    'pl-4',
    'pl-8',
    'pl-12',
    'pl-16',
    'pl-20',
  ],
  plugins: [
     require('@tailwindcss/typography'), // Add typography plugin for prose styling
  ],
}
