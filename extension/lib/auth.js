import { api } from './api.js'
import { APP_URL, AUTH_COOKIE } from './config.js'

// Returns the signed-in user, or null when there is no valid session.
// Network/server errors are rethrown so the UI can tell them apart from "signed out".
export async function getCurrentUser() {
  try {
    const data = await api('/auth/me')
    return data.user
  } catch (err) {
    if (err.status === 401 || err.status === 403) return null
    throw err
  }
}

export async function login(email, password) {
  const data = await api('/auth/login', { method: 'POST', body: { email, password } })
  return data.user
}

export async function logout() {
  await api('/auth/logout', { method: 'POST' }).catch(() => {})
}

// Calls `callback` whenever the session cookie is set or cleared, e.g. when the
// user signs in or out in a web app tab. Returns an unsubscribe function.
export function onSessionChange(callback) {
  const { hostname } = new URL(APP_URL)
  const listener = ({ cookie, cause }) => {
    if (cookie.name !== AUTH_COOKIE) return
    if (cookie.domain.replace(/^\./, '') !== hostname) return
    // An overwrite fires a removal followed by a new cookie; react only to the latter.
    if (cause === 'overwrite') return
    callback()
  }
  chrome.cookies.onChanged.addListener(listener)
  return () => chrome.cookies.onChanged.removeListener(listener)
}
