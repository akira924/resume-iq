import { useAuth } from '../auth/useAuth'
import { ROLE_LABELS } from '../constants'

export default function Welcome() {
  const { user } = useAuth()

  return (
    <div className="main-center">
      <div className="card">
        <h1>Welcome, {user.name}</h1>
        <dl className="details">
          <dt>Name</dt>
          <dd>{user.name}</dd>
          <dt>Role</dt>
          <dd>{ROLE_LABELS[user.role] ?? user.role}</dd>
        </dl>
      </div>
    </div>
  )
}
