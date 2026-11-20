import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore the session from the httpOnly cookie on first load.
  useEffect(() => {
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } })
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(
    (name, email, password) =>
      api('/auth/register', { method: 'POST', body: { name, email, password } }),
    [],
  )

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }, [])

  // Replace the cached user after the server returns an updated copy (e.g. name change).
  const updateUser = useCallback((next) => setUser(next), [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateUser }),
    [user, loading, login, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
