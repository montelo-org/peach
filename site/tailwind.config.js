/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      pacifico: ["Pacifico"],
    },
    extend: {
      colors: {
        peach: "#FFAC40",
      },
    },
  },
  plugins: [],
}

