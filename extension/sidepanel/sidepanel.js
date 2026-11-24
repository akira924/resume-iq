import { APP_URL } from '../lib/config.js'
import { api } from '../lib/api.js'
import { getCurrentUser, login, logout, onSessionChange } from '../lib/auth.js'
import {
  chooseDownloadFolder,
  ensureWriteAccess,
  fileExists,
  folderNameFor,
  getDownloadFolder,
  saveToFolder,
} from '../lib/downloadFolder.js'
import { themeAccent } from '../lib/themes.js'

const $ = (id) => document.getElementById(id)
const views = ['loading', 'error', 'login', 'home']

// ---- Color theme ----

// The panel's accent follows the resume color theme. The last one seen is cached so the
// panel opens in the right colors before the settings have loaded.
const THEME_KEY = 'resumeiq:theme'

function applyTheme(theme) {
  document.documentElement.style.setProperty('--theme', themeAccent(theme))
  try {
    if (theme) localStorage.setItem(THEME_KEY, theme)
  } catch {}
}

let cachedTheme = null
try {
  cachedTheme = localStorage.getItem(THEME_KEY)
} catch {}
applyTheme(cachedTheme)

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
  docData.then(({ settings }) => applyTheme(settings?.theme)).catch(() => {}) // reported on click
}

async function getDocData() {
  try {
    return await (docData ?? Promise.reject(new Error()))
  } catch {
    prefetchDocData() // retry once on demand, e.g. after the server was briefly down
    return docData
  }
}

// kind: 'info' | 'success' | 'error'
function setDocStatus(text, kind = 'info') {
  const el = $('doc-status')
  el.textContent = text
  el.classList.toggle('notice-success', kind === 'success')
  el.classList.toggle('notice-error', kind === 'error')
}

async function readClipboard() {
  try {
    return await navigator.clipboard.readText()
  } catch {
    throw new Error('Could not read the clipboard. Click inside this panel and try again.')
  }
}

// ---- Download folder ----

function renderFolder(handle) {
  const el = $('folder-name')
  el.textContent = handle ? handle.name : 'Not set'
  el.title = handle ? handle.name : ''
  el.classList.toggle('unset', !handle)
  $('choose-folder').textContent = handle ? 'Change' : 'Choose'
}

getDownloadFolder().then(renderFolder)

$('choose-folder').addEventListener('click', async () => {
  try {
    const handle = await chooseDownloadFolder()
    if (handle) renderFolder(handle)
  } catch (err) {
    setDocStatus(err.message || 'Could not set the save location.', 'error')
  }
})

// An error shown as a browser alert (not just in the status line), for problems the user
// must act on before the PDF can be saved.
class AlertError extends Error {}

// Each parser returns the PDF parts plus `companyTarget`; `render` turns those parts into a blob.
// Resume: the clipboard must hold valid resume JSON.
// Cover letter: the clipboard must hold cover letter JSON with a "cover_letter" text.
// Header fields the AI left blank come from the profile.
const GENERATORS = {
  resume: {
    label: 'resume',
    parse: (pdf, _data, text) => pdf.parseResumeText(text),
    fileName: (pdf, parsed) => pdf.resumeFileName(parsed.resume.name),
    render: (pdf, { settings }, parsed) => pdf.renderResumePdf(parsed.resume, settings),
  },
  'cover-letter': {
    label: 'cover letter',
    parse: (pdf, { profile }, text) => pdf.parseCoverLetterText(text, profile),
    fileName: (pdf, parsed) => pdf.coverLetterFileName(parsed.header.name),
    render: (pdf, { settings }, parsed) => pdf.renderCoverLetterPdf(parsed.header, parsed.body, settings),
  },
}

const isUnknownCompany = (name) => !name || /^unknown$/i.test(name)

// Raised when the user cancels; the click ends quietly.
class CancelledError extends Error {}

// Asks for the company name in a dialog. -> the folder-safe name, or null when cancelled.
function askCompanyName(label) {
  const dialog = $('company-dialog')
  const form = $('company-form')
  const input = form.company
  const errorEl = $('company-error')

  $('company-dialog-text').textContent =
    `The ${label} JSON doesn't include a company name. ` +
    'Enter one to name the folder the PDF is saved in.'
  form.reset()
  errorEl.hidden = true

  return new Promise((resolve) => {
    const finish = (value) => {
      form.removeEventListener('submit', onSubmit)
      $('company-cancel').removeEventListener('click', onCancel)
      dialog.removeEventListener('cancel', onCancel)
      if (dialog.open) dialog.close()
      resolve(value)
    }
    const onSubmit = (e) => {
      e.preventDefault()
      const name = folderNameFor(input.value)
      if (isUnknownCompany(name)) {
        errorEl.textContent = 'Enter a company name.'
        errorEl.hidden = false
        input.focus()
        return
      }
      finish(name)
    }
    const onCancel = (e) => {
      e.preventDefault() // Esc: close through finish() so the promise resolves
      finish(null)
    }
    form.addEventListener('submit', onSubmit)
    $('company-cancel').addEventListener('click', onCancel)
    dialog.addEventListener('cancel', onCancel)
    dialog.showModal()
    input.focus()
  })
}

// Renders the PDF and saves it to <download folder>/<company_target>/<file name>.
// -> the saved path, relative to the download folder's parent.
async function generate(kind, text) {
  const gen = GENERATORS[kind]

  const folder = await getDownloadFolder()
  if (!folder) throw new AlertError('Choose a save location first.')
  if (!(await ensureWriteAccess(folder))) {
    throw new AlertError(`ResumeIQ needs permission to save into "${folder.name}". Click the button again and allow it.`)
  }

  const [pdf, data] = await Promise.all([loadPdfModule(), getDocData()])
  const parsed = gen.parse(pdf, data, text)
  if (parsed.error) throw new Error(parsed.error)

  let company = folderNameFor(parsed.companyTarget)
  if (isUnknownCompany(company)) {
    company = await askCompanyName(gen.label)
    if (!company) throw new CancelledError()
  }

  const fileName = gen.fileName(pdf, parsed)
  const path = `${folder.name}/${company}/${fileName}`
  if (await fileExists(folder, company, fileName)) {
    throw new AlertError(`${path} already exists. Delete or rename it first; it wasn't overwritten.`)
  }

  await saveToFolder(folder, company, fileName, await gen.render(pdf, data, parsed))
  return path
}

let generating = false
document.addEventListener('click', async (e) => {
  const button = e.target.closest('[data-generate]')
  if (!button || generating) return
  generating = true
  const buttons = document.querySelectorAll('[data-generate]')
  buttons.forEach((b) => (b.disabled = true))
  setDocStatus('Generating PDF…')
  try {
    // Read the clipboard first, while the click still counts as a user gesture.
    const text = await readClipboard()
    if (!text.trim()) throw new Error('The clipboard is empty. Copy the JSON from your AI chat first.')
    const path = await generate(button.dataset.generate, text)
    setDocStatus(`Saved to ${path}`, 'success')
  } catch (err) {
    if (err instanceof CancelledError) {
      setDocStatus('Cancelled.')
      return
    }
    const message = err.message || 'Could not generate the PDF.'
    setDocStatus(message, 'error')
    if (err instanceof AlertError) alert(message)
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
    errorEl.textContent = 'Enter your email and password.'
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

// Reloads the whole side panel page (fresh session check, settings and PDF generator).
$('reload-panel').addEventListener('click', () => location.reload())

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
