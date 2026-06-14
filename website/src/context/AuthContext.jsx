import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('voxa_token')
    const stored = localStorage.getItem('voxa_user')
    if (token && stored) {
      try { setUser(JSON.parse(stored)) } catch (_) {}
      // Verify token is still valid in background
      api.me().then(u => {
        setUser(u)
        localStorage.setItem('voxa_user', JSON.stringify(u))
      }).catch(() => {
        localStorage.removeItem('voxa_token')
        localStorage.removeItem('voxa_user')
        setUser(null)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const data = await api.login(email, password)
    if (data.requires2FA) return data
    localStorage.setItem('voxa_token', data.token)
    localStorage.setItem('voxa_user', JSON.stringify(data.user))
    setUser(data.user)
    if (window.electronVoxa?.reportToken) window.electronVoxa.reportToken(data.token)
    return data.user
  }

  const register = async (email, username, password) => {
    const { token, user } = await api.register(email, username, password)
    localStorage.setItem('voxa_token', token)
    localStorage.setItem('voxa_user', JSON.stringify(user))
    setUser(user)
    if (window.electronVoxa?.reportToken) window.electronVoxa.reportToken(token)
    return user
  }

  const logout = () => {
    localStorage.removeItem('voxa_token')
    localStorage.removeItem('voxa_user')
    setUser(null)
    if (window.electronVoxa?.clearToken) window.electronVoxa.clearToken()
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
