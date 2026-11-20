import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

// Visiting /logout ends the session and returns to the login page.
export default function Logout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    logout().then(() => !cancelled && navigate('/login', { replace: true }))
    return () => {
      cancelled = true
    }
  }, [logout, navigate])

  return (
    <div className="page">
      <p className="muted">Signing out…</p>
    </div>
  )
}
