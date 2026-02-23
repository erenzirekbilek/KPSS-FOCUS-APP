/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./<ekstra-klasör-isminiz>/**/*.{js,jsx,ts,tsx}",
    "./tests/**/*.{js,jsx,ts,tsx}", // Yeni eklediğin klasörü buraya tanıt
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
