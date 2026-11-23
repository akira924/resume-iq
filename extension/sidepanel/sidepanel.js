import { APP_URL } from '../lib/config.js'
import { api } from '../lib/api.js'
import { getCurrentUser, login, logout, onSessionChange } from '../lib/auth.js'

const $ = (id) => document.getElementById(id)
const views = ['loading', 'error', 'login', 'home']

function show(view) {
  for (const v of views) $(`view-${v}`).hidden = v !== view
  if (view === 'home') prefetchDocData()
}

// ---- PDF downloads ----

// The PDF generator (react-pdf, the resume layout and fonts), built from the client by
// `npm run build:extension`. It's large, so it's loaded once, when the home view shows.
let pdfModule = null
function loadPdfModule() {
  pdfModule ??= import('./vendor/resume-pdf.js').catch((err) => {
    console.error('Failed to load the PDF generator', err)
    pdfModule = null
    throw new Error('The PDF generator is missing. Run "npm run build:extension" in client/, then reload the extension.')
  })
  return pdfModule
}

// The signed-in user's resume customization and profile, prefetched so a click only has to
// read the clipboard and render. Refetched every time the home view shows, so changes
// made in the web app are picked up.
let docData = null // Promise<{ settings, profile }>
function prefetchDocData() {
  loadPdfModule().catch(() => {}) // reported on click
  docData = Promise.all([api('/resume-settings'), api('/profile')]).then(([s, p]) => ({
    settings: s.settings, // null until saved once; the generator then uses the defaults
    profile: p.profile,
  }))
  docData.catch(() => {}) // reported on click
}

async function getDocData() {
  try {
    return await (docData ?? Promise.reject(new Error()))
  } catch {
    prefetchDocData() // retry once on demand, e.g. after the server was briefly down
    return docData
  }
}

function setDocStatus(text, { error = false } = {}) {
  const el = $('doc-status')
  el.textContent = text
  el.classList.toggle('error', error)
}

async function readClipboard() {
  try {
    return await navigator.clipboard.readText()
  } catch {
    throw new Error('Could not read the clipboard. Click inside this panel and try again.')
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// Resume: the clipboard must hold valid resume JSON.
async function generateResume(pdf, { settings }, text) {
  const { resume, error } = pdf.parseResumeText(text)
  if (error) throw new Error(error)
  const fileName = pdf.resumeFileName(resume.name)
  downloadBlob(await pdf.renderResumePdf(resume, settings), fileName)
  return fileName
}

// Cover letter: the clipboard must hold cover letter JSON with a "cover_letter" text.
// Header fields the AI left blank come from the profile.
async function generateCoverLetter(pdf, { settings, profile }, text) {
  const { header, body, error } = pdf.parseCoverLetterText(text, profile)
  if (error) throw new Error(error)
  const fileName = pdf.coverLetterFileName(header.name)
  downloadBlob(await pdf.renderCoverLetterPdf(header, body, settings), fileName)
  return fileName
}

const GENERATORS = { resume: generateResume, 'cover-letter': generateCoverLetter }

let generating = false
document.addEventListener('click', async (e) => {
  const button = e.target.closest('[data-generate]')
  if (!button || generating) return
  generating = true
  const buttons = document.querySelectorAll('[data-generate]')
  buttons.forEach((b) => (b.disabled = true))
  setDocStatus('Generating…')
  try {
    // Read the clipboard first, while the click still counts as a user gesture.
    const text = await readClipboard()
    if (!text.trim()) throw new Error('The clipboard is empty.')
    const [pdf, data] = await Promise.all([loadPdfModule(), getDocData()])
    const fileName = await GENERATORS[button.dataset.generate](pdf, data, text)
    setDocStatus(`Downloaded ${fileName}`)
  } catch (err) {
    setDocStatus(err.message || 'Could not generate the PDF.', { error: true })
  } finally {
    generating = false
    buttons.forEach((b) => (b.disabled = false))
  }
})

function renderUser(user) {
  $('user-name').textContent = user.name
  $('user-email').textContent = user.email
  $('user-initial').textContent = (user.name || '?').trim().charAt(0).toUpperCase()
}

// Bumped on every refresh so a slow response can't overwrite a newer one.
let refreshId = 0

async function refresh({ silent = false } = {}) {
  const id = ++refreshId
  if (!silent) show('loading')
  try {
    const user = await getCurrentUser()
    if (id !== refreshId) return
    if (user) {
      renderUser(user)
      show('home')
    } else {
      show('login')
    }
  } catch (err) {
    if (id !== refreshId) return
    $('error-message').textContent = err.message
    show('error')
  }
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const form = e.currentTarget
  const email = form.email.value.trim()
  const password = form.password.value
  const errorEl = $('login-error')
  const submit = $('login-submit')

  errorEl.hidden = true
  if (!email || !password) {
    errorEl.textContent = 'Email and password are required'
    errorEl.hidden = false
    return
  }

  submit.disabled = true
  submit.textContent = 'Signing in…'
  try {
    const user = await login(email, password)
    form.reset()
    refreshId++ // discard any in-flight refresh
    renderUser(user)
    show('home')
  } catch (err) {
    errorEl.textContent = err.message
    errorEl.hidden = false
  } finally {
    submit.disabled = false
    submit.textContent = 'Sign in'
  }
})

$('logout').addEventListener('click', async () => {
  await logout()
  refreshId++
  show('login')
})

$('retry').addEventListener('click', () => refresh())

// Links/buttons with data-open="/path" open that page of the web app in a new tab.
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-open]')
  if (!el) return
  e.preventDefault()
  chrome.tabs.create({ url: `${APP_URL}${el.dataset.open}` })
})

// Stay in sync with sign-in / sign-out done in a web app tab.
onSessionChange(() => refresh({ silent: true }))

// Re-validate when the panel becomes visible again (e.g. account was deactivated).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refresh({ silent: true })
})

refresh()
