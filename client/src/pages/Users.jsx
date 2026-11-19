import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { PAGE_SIZES, ROLE_LABELS, STATUS, STATUS_ACTIONS, STATUS_LABELS } from '../constants'
import ActionMenu from '../components/ActionMenu'
import Pagination from '../components/Pagination'

const STATUS_CLASS = {
  [STATUS.REJECTED]: 'rejected',
  [STATUS.PENDING]: 'pending',
  [STATUS.ACTIVE]: 'active',
  [STATUS.DEACTIVATED]: 'deactivated',
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function positiveInt(value, fallback) {
  const n = Number.parseInt(value, 10)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export default function Users() {
  const { user: me } = useAuth()
  const [params, setParams] = useSearchParams()

  // Page and page size live in the URL (?page=2&limit=20) so they survive refresh and back/forward.
  const page = positiveInt(params.get('page'), 1)
  const limitParam = positiveInt(params.get('limit'), PAGE_SIZES[0])
  const limit = PAGE_SIZES.includes(limitParam) ? limitParam : PAGE_SIZES[0]
  const query = `page=${page}&limit=${limit}`

  // `query` records which request `data` belongs to; a mismatch means a fetch is in flight.
  const [result, setResult] = useState({ query: null, data: null, error: '' })
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let cancelled = false
    api(`/users?${query}`)
      .then((data) => !cancelled && setResult({ query, data, error: '' }))
      .catch((err) => !cancelled && setResult((r) => ({ query, data: r.data, error: err.message })))
    return () => {
      cancelled = true
    }
  }, [query, reloadKey])

  const loading = result.query !== query
  const data = result.data

  function reload() {
    setResult((r) => ({ ...r, query: null }))
    setReloadKey((k) => k + 1)
  }

  function goTo(nextPage, nextLimit = limit) {
    setActionError('')
    setParams({ page: String(nextPage), limit: String(nextLimit) })
  }

  async function changeStatus(target, action) {
    setActionError('')
    setBusyId(target.id)
    try {
      const { user: updated } = await api(`/users/${target.id}/status`, {
        method: 'PATCH',
        body: { action },
      })
      setResult((r) => ({
        ...r,
        data: { ...r.data, users: r.data.users.map((u) => (u.id === updated.id ? updated : u)) },
      }))
    } catch (err) {
      setActionError(`Couldn’t update ${target.name}: ${err.message}`)
      // 409 = status changed elsewhere; refresh so the row shows the real state.
      if (err.status === 409) reload()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="content">
      <header className="content-header">
        <h1>Users</h1>
        {data && <span className="muted">{data.total} total</span>}
      </header>

      {result.error && (
        <div className="alert alert-error" role="alert">
          {result.error}{' '}
          <button type="button" className="link-button" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <p className="alert alert-error" role="alert">
          {actionError}
        </p>
      )}

      {!data && loading && <p className="muted">Loading users…</p>}

      {data && (
        <>
          <div className={`table-wrap${loading ? ' is-loading' : ''}`} aria-busy={loading}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Registered</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="table-empty muted">
                      No users found
                    </td>
                  </tr>
                )}
                {data.users.map((u) => {
                  const isMe = u.id === me.id
                  const actions = STATUS_ACTIONS[u.status] ?? []
                  return (
                    <tr key={u.id}>
                      <td>
                        {u.name}
                        {isMe && <span className="tag">You</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>{ROLE_LABELS[u.role] ?? u.role}</td>
                      <td>
                        <span className={`status status-${STATUS_CLASS[u.status] ?? 'unknown'}`}>
                          {STATUS_LABELS[u.status] ?? u.status}
                        </span>
                      </td>
                      <td>{u.createdAt ? dateFormat.format(new Date(u.createdAt)) : '—'}</td>
                      <td className="table-actions">
                        {!isMe && (
                          <ActionMenu
                            label={`Actions for ${u.name}`}
                            items={actions}
                            disabled={actions.length === 0 || busyId === u.id}
                            onSelect={(action) => changeStatus(u, action)}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={(p) => goTo(p)}
            onLimitChange={(l) => goTo(1, l)}
          />
        </>
      )}
    </section>
  )
}
