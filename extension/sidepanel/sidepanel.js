import { APP_URL } from '../lib/config.js'
import { getCurrentUser, login, logout, onSessionChange } from '../lib/auth.js'

const $ = (id) => document.getElementById(id)
const views = ['loading', 'error', 'login', 'home']

function show(view) {
  for (const v of views) $(`view-${v}`).hidden = v !== view
}

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
