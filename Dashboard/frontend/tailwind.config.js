/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        turquoise: '#40E0D0',
        coral: '#FF7F50',
      },
    },
  },
  plugins: [],
};
