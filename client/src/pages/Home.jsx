import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ROLE_LABELS } from '../constants'
import Sidebar from '../components/Sidebar'

export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [items] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="layout">
      <Sidebar items={items} selectedId={selectedId} onSelect={setSelectedId} />

      <main className="main">
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
      </main>
    </div>
  )
}
