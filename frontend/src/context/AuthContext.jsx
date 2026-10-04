import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('nammakadai_token')))

  useEffect(() => {
    const token = localStorage.getItem('nammakadai_token')
    if (!token) return
    const checkSession = () => api.get('/auth/me').then(({ data }) => setUser(data)).catch((error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('nammakadai_token')
        setUser(null)
      }
    }).finally(() => setLoading(false))
    checkSession()
    window.addEventListener('focus', checkSession)
    return () => window.removeEventListener('focus', checkSession)
  }, [user?.id])

  const authenticate = (response) => {
    localStorage.setItem('nammakadai_token', response.access_token)
    setUser(response.user)
  }

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)
    authenticate(data)
    return data.user
  }

  const register = async (details) => {
    const { data } = await api.post('/auth/register', details)
    authenticate(data)
    return data.user
  }

  const refresh = async () => {
    const { data } = await api.get('/auth/me')
    setUser(data)
  }

  const logout = () => { localStorage.removeItem('nammakadai_token'); setUser(null) }

  return <AuthContext.Provider value={{ user, loading, login, register, refresh, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
