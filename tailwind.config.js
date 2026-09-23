/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tv: {
          bg: '#131722',
          card: '#1e222d',
          surface: '#2a2e39',
          border: '#363a45',
          text: '#d1d4dc',
          muted: '#787b86',
          green: '#089981',
          greenLight: '#0cb89c',
          greenBg: 'rgba(8, 153, 129, 0.2)',
          red: '#f23645',
          redLight: '#ff495a',
          redBg: 'rgba(242, 54, 69, 0.2)',
          blue: '#2962ff',
          blueHover: '#1e53e5',
          gold: '#f0b90b',
          poc: '#ffb703',
        }
      },
      fontFamily: {
        mono: ['"SF Mono"', 'Consolas', '"Fira Code"', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Trebuchet MS"', 'Roboto', 'Ubuntu', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
