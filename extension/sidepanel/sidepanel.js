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

// The PDF saved by the last export (a FileSystemFileHandle), opened by the open-PDF button.
let savedPdf = null

// kind: 'info' | 'success' | 'error'. Success and error show the scope badge on the left and
// pass a short `text`: the company name, or a brief reason.
//   success: "Successful shot at the company." then, on the next line, the highlighted company.
//   error:   "Couldn't shoot: <reason>."
// The company name is shown as-is, with no period after it; the error sentence ends with
// exactly one period. `detail` (the saved path, or the full error) becomes the hover
// tooltip. `file`: the saved PDF's handle; shows the open-PDF button.
function setDocStatus(text, kind = 'info', { file = null, detail = '' } = {}) {
  const notice = $('doc-notice')
  const status = $('doc-status')
  if (kind === 'success') {
    const name = document.createElement('strong')
    name.className = 'company-highlight'
    name.textContent = text
    name.title = text
    status.replaceChildren('Successful shot at the company.', document.createElement('br'), name)
  } else {
    status.textContent = kind === 'error' ? `Couldn’t shoot: ${text.replace(/\.+$/, '')}.` : text
  }
  notice.title = detail
  notice.hidden = !text
  notice.classList.toggle('notice-success', kind === 'success')
  notice.classList.toggle('notice-error', kind === 'error')
  savedPdf = file
  $('view-pdf').hidden = !file
}

// Opens the saved PDF in a new tab, read back from disk so it shows exactly what was saved.
$('view-pdf').addEventListener('click', async () => {
  if (!savedPdf) return
  try {
    const file = await savedPdf.getFile()
    // The URL stays valid while this panel is open; Chrome frees it when the panel closes.
    const url = URL.createObjectURL(new Blob([file], { type: 'application/pdf' }))
    await chrome.tabs.create({ url })
  } catch (err) {
    console.error('Failed to open the PDF', err)
    setDocStatus('PDF not found', 'error', { detail: 'Could not open the PDF. It may have been moved or deleted.' })
  }
})

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
    setDocStatus('Save location not set', 'error', { detail: err.message || 'Could not set the save location.' })
  }
})

// An error with a short `brief` for the status line; `message` holds the full explanation.
class BriefError extends Error {
  constructor(brief, message) {
    super(message)
    this.brief = brief
  }
}

// A parser's full error message -> a brief reason for the status line.
const briefParseError = (message) => (/missing|has no/i.test(message) ? 'JSON missing data' : 'Invalid JSON')

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
// -> { path, file, company }: the saved path, relative to the download folder's parent,
//    the saved file's handle, and the company (folder) name.
async function generate(kind, text) {
  const gen = GENERATORS[kind]

  const folder = await getDownloadFolder()
  if (!folder) throw new BriefError('No save location', 'Choose a save location first.')
  if (!(await ensureWriteAccess(folder))) {
    throw new BriefError('No folder permission', `ResumeIQ needs permission to save into "${folder.name}". Click the button again and allow it.`)
  }

  const [pdf, data] = await Promise.all([loadPdfModule(), getDocData()])
  const parsed = gen.parse(pdf, data, text)
  if (parsed.error) throw new BriefError(briefParseError(parsed.error), parsed.error)

  let company = folderNameFor(parsed.companyTarget)
  if (isUnknownCompany(company)) {
    company = await askCompanyName(gen.label)
    if (!company) throw new CancelledError()
  }

  const fileName = gen.fileName(pdf, parsed)
  const path = `${folder.name}/${company}/${fileName}`
  if (await fileExists(folder, company, fileName)) {
    throw new BriefError('File already exists', `${path} already exists. Delete or rename it first; it wasn't overwritten.`)
  }

  const file = await saveToFolder(folder, company, fileName, await gen.render(pdf, data, parsed))
  return { path, file, company }
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
    if (!text.trim()) throw new BriefError('Clipboard is empty', 'The clipboard is empty. Copy the JSON from your AI chat first.')
    const { path, file, company } = await generate(button.dataset.generate, text)
    setDocStatus(company, 'success', { file, detail: `Saved to ${path}` })
  } catch (err) {
    if (err instanceof CancelledError) {
      setDocStatus('Cancelled.')
      return
    }
    const message = err.message || 'Could not generate the PDF.'
    setDocStatus(err.brief || 'PDF generation failed', 'error', { detail: message })
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
