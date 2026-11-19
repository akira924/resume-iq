import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setSubmitting(true)
    try {
      const data = await register(form.name, form.email, form.password)
      navigate('/login', { state: { notice: data.message, email: form.email } })
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.data?.errors || {})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={onSubmit} noValidate>
        <h1>Create account</h1>
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <label>
          Name
          <input name="name" autoComplete="name" value={form.name} onChange={onChange} required />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={onChange}
            required
          />
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={onChange}
            required
          />
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>
        <p className="muted">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
