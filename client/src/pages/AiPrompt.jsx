import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { buildResumePrompt } from '../aiPrompt'

// Shows the resume-generation prompt built from the signed-in user's saved profile.
// An optional job description is appended at the end, ready to copy into an AI chat.
export default function AiPrompt() {
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [copyStatus, setCopyStatus] = useState(null) // 'copied' | 'failed'
  const copyTimer = useRef(null)

  useEffect(() => {
    let cancelled = false
    api('/profile')
      .then(({ profile }) => !cancelled && setProfile(profile))
      .catch((err) => !cancelled && setLoadError(err.message))
    return () => {
      cancelled = true
      clearTimeout(copyTimer.current)
    }
  }, [])

  const prompt = useMemo(
    () => (profile ? buildResumePrompt(profile, jobDescription) : ''),
    [profile, jobDescription],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopyStatus(null), 2500)
  }

  const header = (
    <header className="page-header">
      <h1>AI Prompt</h1>
      <p className="muted">A resume generation prompt built from your profile. Paste it into your AI assistant.</p>
    </header>
  )

  if (loadError) {
    return (
      <section className="content prompt-page">
        {header}
        <p className="alert alert-error" role="alert">
          {loadError}
        </p>
      </section>
    )
  }
  if (!profile) {
    return (
      <section className="content prompt-page">
        {header}
        <p className="muted">Loading profile…</p>
      </section>
    )
  }

  const missing = [
    !profile.phone && 'phone number',
    !profile.location && 'location',
    profile.experiences.length === 0 && 'work experience',
    profile.education.length === 0 && 'education',
  ].filter(Boolean)

  return (
    <section className="content prompt-page">
      {header}

      {missing.length > 0 && (
        <p className="alert alert-info">
          Your profile is missing {missing.join(', ')}. <Link to="/home/profile">Complete your profile</Link> for a
          better prompt.
        </p>
      )}

      <section className="form-section" aria-labelledby="ap-jd">
        <div className="section-header">
          <h2 id="ap-jd">Job Description</h2>
          <p className="muted">Optional — paste the posting and it’s added to the end of the prompt.</p>
        </div>
        <label className="visually-hidden" htmlFor="ap-jd-input">
          Job description
        </label>
        <textarea
          id="ap-jd-input"
          className="prompt-jd"
          rows={6}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here…"
        />
      </section>

      <section className="form-section" aria-labelledby="ap-prompt">
        <div className="prompt-toolbar">
          <div className="section-header">
            <h2 id="ap-prompt">Prompt</h2>
            <p className="muted">Updates from your saved profile.</p>
          </div>
          <div className="prompt-actions">
            <span aria-live="polite" className="form-actions-status">
              {copyStatus === 'copied' && <span className="text-success">Copied</span>}
              {copyStatus === 'failed' && <span className="text-error">Couldn’t copy</span>}
            </span>
            <button type="button" onClick={copy}>
              Copy prompt
            </button>
          </div>
        </div>
        <pre className="prompt-text" tabIndex={0} aria-label="Generated prompt">
          {prompt}
        </pre>
      </section>
    </section>
  )
}
