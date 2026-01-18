/** @type {import('tailwindcss').Config} */
export default {
  content:
      [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
      ],
  theme: {
    extend: {
      colors: {
        felt: {
          light: '#2d5a3d',
          DEFAULT: '#1a472a',
          dark: '#0f2c1a',
        },
        poker: {
          gold: '#fbbf24',
          red: '#dc2626',
          blue: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
}