import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { buildCoverLetterPrompt, buildResumePrompt } from '../aiPrompt'
import { useCompanyPrompt, useQaPrompt } from '../hooks/useQaPrompt'

const SAVE_STATUS = {
  saving: <span className="muted">Saving…</span>,
  saved: <span className="text-success">Saved</span>,
  'save-error': <span className="text-error">Couldn’t save</span>,
}

// A generated prompt with its own Copy button. Pass onChange to make it editable;
// onReset (optional) adds a button that restores the default text; `status` is shown
// next to the buttons when there's no copy message. `badge` is a small tag after the title;
// copyable={false} hides the Copy button (for text that only feeds into another prompt).
function PromptBox({ id, title, badge, description, prompt, placeholder, onChange, onReset, status, copyable = true }) {
  const [copyStatus, setCopyStatus] = useState(null) // 'copied' | 'failed'
  const copyTimer = useRef(null)

  useEffect(() => () => clearTimeout(copyTimer.current), [])

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

  return (
    <section className="form-section" aria-labelledby={id}>
      <div className="prompt-toolbar">
        <div className="section-header">
          <h2 id={id}>
            {title}
            {badge && <span className="tag tag-beta">{badge}</span>}
          </h2>
          <p className="muted">{description}</p>
        </div>
        <div className="prompt-actions">
          <span aria-live="polite" className="form-actions-status">
            {copyStatus === 'copied' && <span className="text-success">Copied</span>}
            {copyStatus === 'failed' && <span className="text-error">Couldn’t copy</span>}
            {!copyStatus && status}
          </span>
          {onReset && (
            <button type="button" className="secondary" onClick={onReset}>
              Reset
            </button>
          )}
          {copyable && (
            <button type="button" onClick={copy}>
              Copy prompt
            </button>
          )}
        </div>
      </div>
      {onChange ? (
        <textarea
          className="prompt-text prompt-edit"
          rows={14}
          aria-label={`${title} text`}
          value={prompt}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <pre className="prompt-text" tabIndex={0} aria-label={`${title} text`}>
          {prompt}
        </pre>
      )}
    </section>
  )
}

// Shows the resume and cover letter prompts built from the signed-in user's saved profile.
// An optional job description is appended to the resume prompt, ready to copy into an AI chat.
export default function AiPrompt() {
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const company = useCompanyPrompt()
  const qa = useQaPrompt()

  useEffect(() => {
    let cancelled = false
    api('/profile')
      .then(({ profile }) => !cancelled && setProfile(profile))
      .catch((err) => !cancelled && setLoadError(err.message))
    return () => {
      cancelled = true
    }
  }, [])

  const resumePrompt = useMemo(
    () => (profile ? buildResumePrompt(profile, jobDescription, company.prompt ?? '') : ''),
    [profile, jobDescription, company.prompt],
  )
  const coverLetterPrompt = useMemo(() => (profile ? buildCoverLetterPrompt(profile) : ''), [profile])

  const header = (
    <header className="page-header">
      <h1>AI Prompt</h1>
      <p className="muted">
        Resume and cover letter prompts built from your profile. Paste them into your AI assistant.
      </p>
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
          <p className="muted">Optional — paste the posting and it’s added to the end of the resume prompt.</p>
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

      {company.prompt !== null ? (
        <PromptBox
          id="ap-company"
          title="Tailored Company Prompt"
          badge="Beta"
          description="Optional — added to the resume prompt right after the company target. Edits save automatically."
          prompt={company.prompt}
          placeholder="e.g. Emphasize experience relevant to this company’s products and industry…"
          onChange={company.setPrompt}
          onReset={company.prompt ? company.reset : undefined}
          status={SAVE_STATUS[company.status]}
          copyable={false}
        />
      ) : (
        <section className="form-section" aria-labelledby="ap-company">
          <div className="section-header">
            <h2 id="ap-company">
              Tailored Company Prompt
              <span className="tag tag-beta">Beta</span>
            </h2>
            {company.status === 'load-error' ? (
              <p className="text-error">Couldn’t load the Tailored Company Prompt. Reload the page to try again.</p>
            ) : (
              <p className="muted">Loading…</p>
            )}
          </div>
        </section>
      )}

      <PromptBox
        id="ap-resume"
        title="Resume Prompt"
        description="Generates your resume as JSON from your saved profile."
        prompt={resumePrompt}
      />

      <PromptBox
        id="ap-cover"
        title="Cover Letter Prompt"
        description="Best used in the same chat, right after the resume, so it can draw on that evidence."
        prompt={coverLetterPrompt}
      />

      {qa.prompt !== null ? (
        <PromptBox
          id="ap-qa"
          title="Q/A Prompt"
          description="Use after the resume, then paste the questions. Edits save automatically."
          prompt={qa.prompt}
          onChange={qa.setPrompt}
          onReset={qa.prompt === qa.defaultPrompt ? undefined : qa.reset}
          status={SAVE_STATUS[qa.status]}
        />
      ) : (
        <section className="form-section" aria-labelledby="ap-qa">
          <div className="section-header">
            <h2 id="ap-qa">Q/A Prompt</h2>
            {qa.status === 'load-error' ? (
              <p className="text-error">Couldn’t load the Q/A prompt. Reload the page to try again.</p>
            ) : (
              <p className="muted">Loading…</p>
            )}
          </div>
        </section>
      )}
    </section>
  )
}
