/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        voxa: {
          red: '#E53935',
          'red-dark': '#B71C1C',
          'red-light': '#EF5350',
          'red-glow': '#FF5252',
          bg: '#111214',
          'sidebar-dark': '#1E1F22',
          'sidebar': '#2B2D31',
          'chat': '#313338',
          'input': '#383A40',
          'hover': '#35373C',
          'selected': '#404249',
          text: '#DCDDDE',
          'text-muted': '#949BA4',
          'text-dim': '#5C5E66',
          header: '#F2F3F5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'gg sans', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
}
