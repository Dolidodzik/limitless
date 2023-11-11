/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      opacity: {
        '1': '0.01',
        '15': '0.15',
        '35': '0.35',
        '65': '0.65',
       }
    },
  },
  plugins: [],
}

