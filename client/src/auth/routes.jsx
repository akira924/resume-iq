import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { ROLE } from '../constants'

function Loading() {
  return (
    <div className="page">
      <p className="muted">Loading…</p>
    </div>
  )
}

// Only for signed-in users; otherwise redirect to /login.
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

// Only for admins; anyone else is sent back to /home. Use inside ProtectedRoute.
export function AdminRoute() {
  const { user } = useAuth()
  if (user?.role !== ROLE.ADMIN) return <Navigate to="/home" replace />
  return <Outlet />
}

// Only for regular users (role 0); admins are sent back to /home. Use inside ProtectedRoute.
export function UserRoute() {
  const { user } = useAuth()
  if (user?.role !== ROLE.USER) return <Navigate to="/home" replace />
  return <Outlet />
}

// Only for signed-out users (login/register); signed-in users go home.
export function GuestRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (user) return <Navigate to="/home" replace />
  return <Outlet />
}
