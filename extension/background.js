import { api } from './lib/api.js'
import { buildResumePrompt } from './lib/aiPrompt.js'
import { DEFAULT_THEME, themeAccent } from './lib/themes.js'

// Clicking the toolbar icon opens the side panel instead of a popup.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('Failed to set side panel behavior', err))

// The content script on chatgpt.com can't call the app API itself (it runs under the
// page's origin, so the session cookie and host permission don't apply). It asks here.
//
// Returns the button accent color and the resume prompt built without a job
// description (the content script appends the clipboard text under its heading).
// `error` explains why `resumePrompt` is null.
async function getContext() {
  const [settings, profile] = await Promise.allSettled([api('/resume-settings'), api('/profile')])

  // Signed out, server down, or no settings saved yet: fall back to the default theme.
  const accent = themeAccent(
    settings.status === 'fulfilled' ? settings.value.settings?.theme : DEFAULT_THEME,
  )

  if (profile.status === 'fulfilled') {
    return { accent, resumePrompt: buildResumePrompt(profile.value.profile), error: null }
  }
  const status = profile.reason?.status
  const error =
    status === 401 || status === 403
      ? 'Sign in to ResumeIQ first (toolbar icon → side panel).'
      : profile.reason?.message || 'Could not load your ResumeIQ profile.'
  return { accent, resumePrompt: null, error }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'resumeiq:get-context') return false
  getContext().then(sendResponse)
  return true // keep the channel open for the async response
})
