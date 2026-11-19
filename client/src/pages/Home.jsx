import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ROLE_LABELS } from '../constants'

export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Welcome, {user.name}</h1>
        <dl className="details">
          <dt>Name</dt>
          <dd>{user.name}</dd>
          <dt>Role</dt>
          <dd>{ROLE_LABELS[user.role] ?? user.role}</dd>
        </dl>
        <button type="button" className="secondary" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  )
}
