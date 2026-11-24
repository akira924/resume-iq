import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { buildCoverLetterPrompt, buildResumePrompt } from '../aiPrompt'

const QA_PROMPT_KEY = 'resumeiq.qaPrompt'

const DEFAULT_QA_PROMPT = `I am filling in the online application form for the job below.

For each question, write an answer that is (1) true to my background, (2) under the character limit I give, and (3) uses the ad's keywords where they fit naturally, within only one paragraph based on the job description and my resume generated.

For yes/no knock-out questions, only answer "Yes" or "No".

For asking only number of years of experience, only answer enough number.

Write answers as a human candidate, so those answers are not flagged as an AI generated sentence.

Use ", ', - instead of smart characters.`

function loadQaPrompt() {
  try {
    return localStorage.getItem(QA_PROMPT_KEY) ?? DEFAULT_QA_PROMPT
  } catch {
    return DEFAULT_QA_PROMPT
  }
}

function saveQaPrompt(value) {
  try {
    if (value === DEFAULT_QA_PROMPT) localStorage.removeItem(QA_PROMPT_KEY)
    else localStorage.setItem(QA_PROMPT_KEY, value)
  } catch {
    // Storage unavailable (private mode, blocked) — edits just won't persist.
  }
}

// A generated prompt with its own Copy button. Pass onChange to make it editable;
// onReset (optional) adds a button that restores the default text.
function PromptBox({ id, title, description, prompt, onChange, onReset }) {
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
          <h2 id={id}>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        <div className="prompt-actions">
          <span aria-live="polite" className="form-actions-status">
            {copyStatus === 'copied' && <span className="text-success">Copied</span>}
            {copyStatus === 'failed' && <span className="text-error">Couldn’t copy</span>}
          </span>
          {onReset && (
            <button type="button" className="secondary" onClick={onReset}>
              Reset
            </button>
          )}
          <button type="button" onClick={copy}>
            Copy prompt
          </button>
        </div>
      </div>
      {onChange ? (
        <textarea
          className="prompt-text prompt-edit"
          rows={14}
          aria-label={`${title} text`}
          value={prompt}
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
  const [qaPrompt, setQaPrompt] = useState(loadQaPrompt)

  function updateQaPrompt(value) {
    setQaPrompt(value)
    saveQaPrompt(value)
  }

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
    () => (profile ? buildResumePrompt(profile, jobDescription) : ''),
    [profile, jobDescription],
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

      <PromptBox
        id="ap-qa"
        title="Q/A Prompt"
        description="Use after the resume, then paste the questions. Editable and saved in this browser."
        prompt={qaPrompt}
        onChange={updateQaPrompt}
        onReset={qaPrompt === DEFAULT_QA_PROMPT ? undefined : () => updateQaPrompt(DEFAULT_QA_PROMPT)}
      />
    </section>
  )
}
