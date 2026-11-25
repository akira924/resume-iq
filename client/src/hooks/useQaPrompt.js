import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'

const SAVE_DELAY_MS = 600
// Where Q/A edits lived before the prompt was saved on the server; moved over once, then removed.
const LEGACY_QA_KEY = 'resumeiq.qaPrompt'

function takeLegacyQaPrompt() {
  try {
    const raw = localStorage.getItem(LEGACY_QA_KEY)
    localStorage.removeItem(LEGACY_QA_KEY)
    return raw
  } catch {
    return null
  }
}

// One editable prompt from GET/PUT /api/prompts (`field` is its key there), loaded from and
// autosaved to the server. `prompt` is null until loaded. `onLoad(data)` returns the text to
// show plus `migrate: true` when that text still needs saving.
// `status` is one of: loading | load-error | idle | saving | saved | save-error
function usePromptSetting(field, onLoad) {
  const [prompt, setPromptState] = useState(null)
  const [defaultPrompt, setDefaultPrompt] = useState(null)
  const [status, setStatus] = useState('loading')

  const unsaved = useRef(null) // latest text not yet sent to the server
  const timer = useRef(null)
  const saveSeq = useRef(0)
  const onLoadRef = useRef(onLoad)

  const put = useCallback(
    (text, options) => api('/prompts', { method: 'PUT', body: { [field]: text }, ...options }),
    [field],
  )

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const next = unsaved.current
    if (next === null) return
    unsaved.current = null
    const seq = ++saveSeq.current
    setStatus('saving')
    try {
      await put(next)
      if (seq === saveSeq.current) setStatus('saved')
    } catch {
      if (seq === saveSeq.current) {
        if (unsaved.current === null) unsaved.current = next
        setStatus('save-error')
      }
    }
  }, [put])

  const setPrompt = useCallback(
    (next) => {
      setPromptState(next)
      unsaved.current = next
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DELAY_MS)
    },
    [flush],
  )

  useEffect(() => {
    let cancelled = false
    api('/prompts')
      .then((data) => {
        if (cancelled) return
        const { text, defaultText, migrate } = onLoadRef.current(data)
        setDefaultPrompt(defaultText)
        setStatus('idle')
        if (migrate) setPrompt(text)
        else setPromptState(text)
      })
      .catch(() => !cancelled && setStatus('load-error'))
    return () => {
      cancelled = true
    }
  }, [setPrompt])

  // Don't drop a pending save when leaving the page or closing the tab.
  useEffect(() => {
    const sendNow = () => {
      clearTimeout(timer.current)
      if (unsaved.current !== null) {
        put(unsaved.current, { keepalive: true }).catch(() => {})
        unsaved.current = null
      }
    }
    window.addEventListener('pagehide', sendNow)
    return () => {
      window.removeEventListener('pagehide', sendNow)
      sendNow()
    }
  }, [put])

  const reset = useCallback(() => defaultPrompt !== null && setPrompt(defaultPrompt), [defaultPrompt, setPrompt])

  return { prompt, defaultPrompt, status, setPrompt, reset, retry: flush }
}

function loadQa(data) {
  const legacy = takeLegacyQaPrompt()
  if (legacy && data.qaPromptIsDefault && legacy !== data.defaultQaPrompt) {
    return { text: legacy, defaultText: data.defaultQaPrompt, migrate: true }
  }
  return { text: data.qaPrompt, defaultText: data.defaultQaPrompt }
}

const loadCompany = (data) => ({ text: data.companyPrompt ?? '', defaultText: '' })

// The signed-in user's Q/A prompt (the Chrome extension's Q/A button sends the saved version).
export const useQaPrompt = () => usePromptSetting('qaPrompt', loadQa)

// The signed-in user's Tailored Company Prompt (beta): inserted into the resume prompt, both
// here and in the Chrome extension. Starts empty.
export const useCompanyPrompt = () => usePromptSetting('companyPrompt', loadCompany)
