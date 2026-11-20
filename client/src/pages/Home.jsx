import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ROLE, ROLE_LABELS } from '../constants'
import Sidebar from '../components/Sidebar'

const ADMIN_ITEMS = [{ id: 'users', label: 'Users' }]
const USER_ITEMS = [{ id: 'profile', label: 'Profile' }]

export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const items = user.role === ROLE.ADMIN ? ADMIN_ITEMS : USER_ITEMS
  // /home/users -> 'users'; /home -> null
  const selectedId = location.pathname.split('/')[2] || null

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="layout">
      <Sidebar
        items={items}
        selectedId={selectedId}
        onSelect={(id) => navigate(`/home/${id}`)}
        footer={
          <div className="sidebar-user">
            <div>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="muted">{ROLE_LABELS[user.role] ?? user.role}</div>
            </div>
            <button type="button" className="secondary small" onClick={onLogout}>
              Log out
            </button>
          </div>
        }
      />

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
