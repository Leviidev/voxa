/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        voxa: {
          red: '#E53935',
          'red-dark': '#C62828',
          'red-light': '#EF5350',
          bg: '#FFFFFF',
          sidebar: '#F2F3F5',
          'sidebar-dark': '#E3E5E8',
          chat: '#FFFFFF',
          hover: '#EAEBEE',
          selected: '#E0E2E6',
          input: '#EAEBEE',
          border: '#E3E5E8',
          header: '#1A1B1E',
          text: '#313439',
          'text-muted': '#5C6068',
          'text-dim': '#96989D',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
}
