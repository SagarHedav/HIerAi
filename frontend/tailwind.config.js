/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'linkedin-blue': '#0A66C2',
        'linkedin-green': '#7FC15E',
        'linkedin-gray': '#F3F2EF',
      }
    },
  },
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    themes: ["dark", "corporate"],
  }
}
