// Turns resume JSON / cover letter text into downloadable PDFs.
// Used by the web app and bundled into the Chrome extension's side panel
// (see vite.extension.config.js), so it must not depend on the router or page state.
import { pdf } from '@react-pdf/renderer'
import ResumeDocument, { CoverLetterDocument } from './ResumeDocument'
import { normalizeResume, normalizeSettings } from './options'

export { normalizeSettings }

// Strips a ``` code fence around the text, as an AI chat's "copy" button may include it.
const stripFence = (text) =>
  text
    .trim()
    .replace(/^```[\w-]*\s*\n?/, '')
    .replace(/\n?\s*```$/, '')
    .trim()

// The "company_target" both prompts ask for, trimmed; '' when missing.
const companyTarget = (data) => (typeof data.company_target === 'string' ? data.company_target.trim() : '')

// Parses resume JSON copied from an AI chat.
// -> { resume, companyTarget } (resume is normalizeResume() output) or { error } (a message for the user)
export function parseResumeText(text) {
  let data
  try {
    data = JSON.parse(stripFence(text))
  } catch {
    return { error: 'The clipboard doesn’t contain valid JSON. Copy the resume JSON from the AI chat.' }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'The resume JSON must be an object, e.g. { "personal_info": { … } }.' }
  }
  const resume = normalizeResume(data)
  if (!resume.name) {
    return { error: 'The resume JSON is missing personal_info.name.' }
  }
  if (!resume.summary && resume.experience.length === 0 && resume.skillsets.length === 0) {
    return { error: 'The resume JSON has no summary, skills or experience.' }
  }
  return { resume, companyTarget: companyTarget(data) }
}

// Only the non-blank string fields of `value`, so they can override defaults.
const filled = (value) =>
  Object.fromEntries(
    Object.entries(value && typeof value === 'object' ? value : {}).filter(
      ([, v]) => typeof v === 'string' && v.trim(),
    ),
  )

// Parses cover letter JSON copied from an AI chat (the shape the cover letter prompt asks
// for: personal_info, headline, online_presence, cover_letter). Header fields the AI left
// blank are filled from `profile` (the GET /api/profile shape).
// -> { header, body, companyTarget } or { error } (a message for the user)
export function parseCoverLetterText(text, profile) {
  let data
  try {
    data = JSON.parse(stripFence(text))
  } catch {
    return { error: 'The clipboard doesn’t contain valid JSON. Copy the cover letter JSON from the AI chat.' }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'The cover letter JSON must be an object, e.g. { "cover_letter": "…" }.' }
  }
  if (typeof data.cover_letter !== 'string' || !data.cover_letter.trim()) {
    return { error: 'The cover letter JSON is missing the "cover_letter" text.' }
  }

  // The letter should hold real line breaks; some copies keep them as literal "\n".
  let body = data.cover_letter.trim()
  if (!body.includes('\n') && body.includes('\\n')) body = body.replace(/\\n/g, '\n')

  const p = profile ?? {}
  const header = normalizeResume({
    personal_info: {
      ...filled({ name: p.name, email: p.email, phone: p.phone, location: p.location }),
      ...filled(data.personal_info),
    },
    headline: data.headline,
    online_presence: {
      ...filled({ linkedin: p.linkedin, github: p.github, website: p.website }),
      ...filled(data.online_presence),
    },
  })
  if (!header.name) {
    return { error: 'The cover letter JSON is missing personal_info.name.' }
  }
  return { header, body, companyTarget: companyTarget(data) }
}

// "Alex Q. Doe" -> "Alex_Q_Doe"
const fileBase = (name) =>
  (name ?? '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')

// "Alex_Doe_Resume.pdf", or "Resume.pdf" without a name.
const withName = (name, suffix) => (fileBase(name) ? `${fileBase(name)}_${suffix}.pdf` : `${suffix}.pdf`)
export const resumeFileName = (name) => withName(name, 'Resume')
export const coverLetterFileName = (name) => withName(name, 'Cover_Letter')

export function renderResumePdf(resume, settings) {
  return pdf(<ResumeDocument resume={resume} settings={normalizeSettings(settings)} />).toBlob()
}

export function renderCoverLetterPdf(header, body, settings) {
  return pdf(<CoverLetterDocument header={header} body={body} settings={normalizeSettings(settings)} />).toBlob()
}
