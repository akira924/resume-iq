import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { SENIORITY_OPTIONS } from '../constants'
import { Field, SelectField } from '../components/Field'

// Repeatable entries. `fields` drive both rendering and the blank entry added by "Add".
// `titleField` names the entry's card once filled in; `cols` is the widest grid it uses.
const LISTS = {
  experiences: {
    title: 'Experience',
    itemLabel: 'Experience',
    addLabel: 'Add experience',
    emptyText: 'Add the roles you want on your resume, most recent first.',
    titleField: 'company',
    cols: 2,
    fields: [
      { name: 'company', label: 'Company name', required: true },
      { name: 'period', label: 'Period', required: true, placeholder: 'e.g. Jan 2021 – Present' },
      { name: 'location', label: 'Location', placeholder: 'e.g. New York, NY' },
      {
        name: 'bullets',
        label: 'Number of bullet points',
        type: 'number',
        min: 1,
        max: 20,
        initial: '3',
        hint: 'From 1 to 20',
      },
    ],
  },
  education: {
    title: 'Education',
    itemLabel: 'Education',
    addLabel: 'Add education',
    emptyText: 'Add your degrees, most recent first.',
    titleField: 'institution',
    cols: 2,
    fields: [
      { name: 'institution', label: 'Institution name', required: true },
      { name: 'degree', label: 'Degree and major', required: true, placeholder: 'e.g. BSc Computer Science' },
      { name: 'location', label: 'Location' },
      { name: 'period', label: 'Period', placeholder: 'e.g. 2016 – 2020' },
    ],
  },
  certifications: {
    title: 'Certifications',
    itemLabel: 'Certification',
    addLabel: 'Add certification',
    emptyText: 'Optional — add any certifications worth highlighting.',
    titleField: 'name',
    cols: 3,
    fields: [
      { name: 'institution', label: 'Institution name', placeholder: 'e.g. Amazon Web Services' },
      { name: 'name', label: 'Certification name', placeholder: 'e.g. Solutions Architect – Associate' },
      { name: 'date', label: 'Date', placeholder: 'e.g. Jun 2023' },
    ],
  },
}

let nextKey = 0
const withKey = (item) => ({ ...item, _key: ++nextKey })
const blankItem = (listName) =>
  withKey(Object.fromEntries(LISTS[listName].fields.map((f) => [f.name, f.initial ?? ''])))

const asText = (v) => (v === null || v === undefined ? '' : String(v))

// Server shape -> form state (all strings, list items get a stable React key).
function toForm(p) {
  const form = {
    name: p.name,
    email: p.email,
    phone: p.phone,
    location: p.location,
    linkedin: p.linkedin,
    github: p.github,
    website: p.website,
    seniority: p.seniority,
    yearsOfExperience: asText(p.yearsOfExperience),
  }
  for (const [listName, cfg] of Object.entries(LISTS)) {
    form[listName] = (p[listName] ?? []).map((item) =>
      withKey(Object.fromEntries(cfg.fields.map((f) => [f.name, asText(item[f.name])]))),
    )
  }
  return form
}

// Form state -> request body (drop keys and the read-only email).
function toPayload(form) {
  // eslint-disable-next-line no-unused-vars
  const { email, ...rest } = form
  const payload = { ...rest }
  for (const listName of Object.keys(LISTS)) {
    // eslint-disable-next-line no-unused-vars
    payload[listName] = form[listName].map(({ _key, ...item }) => item)
  }
  return payload
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState(null)
  const [savedJson, setSavedJson] = useState('')
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    api('/profile')
      .then(({ profile }) => {
        if (cancelled) return
        const f = toForm(profile)
        setForm(f)
        setSavedJson(JSON.stringify(toPayload(f)))
      })
      .catch((err) => !cancelled && setLoadError(err.message))
    return () => {
      cancelled = true
    }
  }, [])

  const dirty = useMemo(() => form && JSON.stringify(toPayload(form)) !== savedJson, [form, savedJson])

  // Warn before closing/reloading the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // After a failed save, move focus to the first invalid field.
  useEffect(() => {
    formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [errors])

  function clearError(path) {
    setErrors((e) => {
      if (!(path in e)) return e
      const next = { ...e }
      delete next[path]
      return next
    })
  }

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
    setMessage(null)
    clearError(name)
  }

  function setItemField(listName, index, name, value) {
    setForm((f) => ({
      ...f,
      [listName]: f[listName].map((item, i) => (i === index ? { ...item, [name]: value } : item)),
    }))
    setMessage(null)
    clearError(`${listName}.${index}.${name}`)
  }

  function addItem(listName) {
    setForm((f) => ({ ...f, [listName]: [...f[listName], blankItem(listName)] }))
    setMessage(null)
  }

  function removeItem(listName, index) {
    setForm((f) => ({ ...f, [listName]: f[listName].filter((_, i) => i !== index) }))
    setMessage(null)
    // Indexes shift after a removal, so drop this list's errors rather than show them on the wrong entry.
    setErrors((e) =>
      Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(`${listName}.`))),
    )
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const data = await api('/profile', { method: 'PUT', body: toPayload(form) })
      const f = toForm(data.profile)
      setForm(f)
      setSavedJson(JSON.stringify(toPayload(f)))
      setErrors({})
      updateUser(data.user)
      setMessage({ type: 'success', text: 'Profile saved' })
    } catch (err) {
      setErrors(err.data?.errors ?? {})
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <section className="content">
        <h1>Profile</h1>
        <p className="alert alert-error" role="alert">
          {loadError}
        </p>
      </section>
    )
  }
  if (!form) {
    return (
      <section className="content">
        <h1>Profile</h1>
        <p className="muted">Loading profile…</p>
      </section>
    )
  }

  const text = (name, label, props = {}) => (
    <Field
      id={`pf-${name}`}
      label={label}
      value={form[name]}
      error={errors[name]}
      onChange={(e) => setField(name, e.target.value)}
      {...props}
    />
  )

  const renderList = (listName) => {
    const cfg = LISTS[listName]
    const items = form[listName]
    return (
      <div className="entries">
        {errors[listName] && <p className="field-error">{errors[listName]}</p>}
        {items.length === 0 && <p className="entries-empty muted">{cfg.emptyText}</p>}
        {items.map((item, index) => {
          const fallback = `${cfg.itemLabel} ${index + 1}`
          const title = item[cfg.titleField]?.trim() || fallback
          return (
            <fieldset key={item._key} className="entry">
              <legend className="visually-hidden">{fallback}</legend>
              <div className="entry-header">
                <span className="entry-index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="entry-title">{title}</span>
                <button
                  type="button"
                  className="link-button entry-remove"
                  onClick={() => removeItem(listName, index)}
                  aria-label={`Remove ${fallback.toLowerCase()}`}
                >
                  Remove
                </button>
              </div>
              <div className={`form-grid cols-${cfg.cols}`}>
                {cfg.fields.map((f) => {
                  const path = `${listName}.${index}.${f.name}`
                  return (
                    <Field
                      key={f.name}
                      id={`pf-${listName}-${item._key}-${f.name}`}
                      label={f.label}
                      required={f.required}
                      placeholder={f.placeholder}
                      hint={f.hint}
                      type={f.type ?? 'text'}
                      min={f.min}
                      max={f.max}
                      step={f.type === 'number' ? 1 : undefined}
                      inputMode={f.type === 'number' ? 'numeric' : undefined}
                      value={item[f.name]}
                      error={errors[path]}
                      onChange={(e) => setItemField(listName, index, f.name, e.target.value)}
                    />
                  )
                })}
              </div>
            </fieldset>
          )
        })}
        <button type="button" className="add-button" onClick={() => addItem(listName)}>
          + {cfg.addLabel}
        </button>
      </div>
    )
  }

  const section = (id, title, description, children) => (
    <section className="form-section" aria-labelledby={id}>
      <div className="section-header">
        <h2 id={id}>{title}</h2>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </section>
  )

  return (
    <form ref={formRef} className="content profile" onSubmit={onSubmit} noValidate>
      <header className="page-header">
        <h1>Profile</h1>
        <p className="muted">These details are used to build your resume.</p>
      </header>

      {section(
        'pf-s1',
        'Personal Information',
        'How employers can reach you.',
        <div className="form-grid cols-2">
          {text('name', 'Full Name', { required: true, autoComplete: 'name', placeholder: user.name })}
          {text('email', 'Email Address', {
            type: 'email',
            readOnly: true,
            hint: 'Your sign-in email can’t be changed here',
          })}
          {text('phone', 'Phone Number', {
            required: true,
            type: 'tel',
            autoComplete: 'tel',
            placeholder: 'e.g. (555) 123-4567',
          })}
          {text('location', 'Location', {
            required: true,
            placeholder: 'e.g. San Francisco, CA',
            autoComplete: 'address-level2',
          })}
        </div>,
      )}

      {section(
        'pf-s2',
        'Online Presence',
        'Optional links shown in your resume header.',
        <div className="form-grid cols-3">
          {text('linkedin', 'LinkedIn', { type: 'url', placeholder: 'linkedin.com/in/you' })}
          {text('github', 'GitHub', { type: 'url', placeholder: 'github.com/you' })}
          {text('website', 'Website', { type: 'url', placeholder: 'yourwebsite.com' })}
        </div>,
      )}

      {section(
        'pf-s3',
        'Work Experience',
        'Your overall level and the roles you’ve held.',
        <>
          <div className="form-grid cols-2">
            <SelectField
              id="pf-seniority"
              label="Seniority level"
              required
              options={SENIORITY_OPTIONS}
              value={form.seniority}
              error={errors.seniority}
              onChange={(e) => setField('seniority', e.target.value)}
            />
            {text('yearsOfExperience', 'Years of experience', {
              required: true,
              type: 'number',
              min: 1,
              max: 20,
              step: 1,
              inputMode: 'numeric',
              hint: 'From 1 to 20',
            })}
          </div>
          <h3 className="list-heading">Experience</h3>
          {renderList('experiences')}
        </>,
      )}

      {section('pf-s4', 'Education', null, renderList('education'))}

      {section('pf-s5', 'Certifications', null, renderList('certifications'))}

      <div className="form-actions">
        <span aria-live="polite" className="form-actions-status">
          {message ? (
            <span className={message.type === 'error' ? 'text-error' : 'text-success'}>{message.text}</span>
          ) : (
            dirty && <span className="muted">Unsaved changes</span>
          )}
        </span>
        <button type="submit" disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}
