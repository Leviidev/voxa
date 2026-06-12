import { createContext, useContext, useState, useEffect } from 'react'

function darkenHex(hex, amount = 35) {
  const h = hex.replace('#', '')
  const num = parseInt(h, 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0xff) - amount)
  const b = Math.max(0, (num & 0xff) - amount)
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

const DEFAULTS = {
  theme: 'light',
  accentColor: '#E53935',
  fontSize: 'medium',
  messageDisplay: 'cozy',
  reduceMotion: false,
}

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('voxa_theme_prefs') || '{}')
      return { ...DEFAULTS, ...saved }
    } catch { return { ...DEFAULTS } }
  })

  useEffect(() => {
    const { theme, accentColor, fontSize, messageDisplay, reduceMotion } = prefs
    localStorage.setItem('voxa_theme_prefs', JSON.stringify(prefs))

    const html = document.documentElement
    html.classList.toggle('dark', theme === 'dark')
    html.style.setProperty('--accent', accentColor)
    html.style.setProperty('--accent-dark', darkenHex(accentColor))
    html.style.setProperty('--accent-subtle', accentColor + '18')

    const fsMap = { small: '12px', medium: '14px', large: '15px', xlarge: '16px' }
    html.style.setProperty('--chat-font-size', fsMap[fontSize] || '14px')
    html.setAttribute('data-msg-display', messageDisplay)
    html.setAttribute('data-reduce-motion', reduceMotion ? 'true' : 'false')
  }, [prefs])

  const set = (key, value) => setPrefs(p => ({ ...p, [key]: value }))

  return (
    <ThemeContext.Provider value={{ ...prefs, set }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
