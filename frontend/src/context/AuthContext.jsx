import { createContext, useContext, useEffect, useState } from 'react'
import { api, setToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const loadUser = token ? api.get('/auth/me') : Promise.reject(new Error('no token'))
    loadUser
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password })
    setToken(data.access_token)
    setUser(data.user)
  }

  async function register(email, password, fullName, role) {
    const data = await api.post('/auth/register', {
      email,
      password,
      full_name: fullName,
      role,
    })
    setToken(data.access_token)
    setUser(data.user)
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- standard context-hook co-location
export function useAuth() {
  return useContext(AuthContext)
}
