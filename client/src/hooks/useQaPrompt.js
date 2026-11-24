import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'

const SAVE_DELAY_MS = 600
// Where edits lived before the prompt was saved on the server; moved over once, then removed.
const LEGACY_KEY = 'resumeiq.qaPrompt'

function takeLegacyPrompt() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    localStorage.removeItem(LEGACY_KEY)
    return raw
  } catch {
    return null
  }
}

function putPrompt(qaPrompt, options) {
  return api('/prompts', { method: 'PUT', body: { qaPrompt }, ...options })
}

// The signed-in user's Q/A prompt, loaded from and autosaved to the server (the Chrome
// extension's Q/A button sends the saved version). `prompt` is null until loaded.
// `status` is one of: loading | load-error | idle | saving | saved | save-error
export function useQaPrompt() {
  const [prompt, setPromptState] = useState(null)
  const [defaultPrompt, setDefaultPrompt] = useState(null)
  const [status, setStatus] = useState('loading')

  const unsaved = useRef(null) // latest text not yet sent to the server
  const timer = useRef(null)
  const saveSeq = useRef(0)

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const next = unsaved.current
    if (next === null) return
    unsaved.current = null
    const seq = ++saveSeq.current
    setStatus('saving')
    try {
      await putPrompt(next)
      if (seq === saveSeq.current) setStatus('saved')
    } catch {
      if (seq === saveSeq.current) {
        if (unsaved.current === null) unsaved.current = next
        setStatus('save-error')
      }
    }
  }, [])

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
        setDefaultPrompt(data.defaultQaPrompt)
        const legacy = takeLegacyPrompt()
        if (legacy && data.qaPromptIsDefault && legacy !== data.defaultQaPrompt) {
          setStatus('idle')
          setPrompt(legacy)
        } else {
          setPromptState(data.qaPrompt)
          setStatus('idle')
        }
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
        putPrompt(unsaved.current, { keepalive: true }).catch(() => {})
        unsaved.current = null
      }
    }
    window.addEventListener('pagehide', sendNow)
    return () => {
      window.removeEventListener('pagehide', sendNow)
      sendNow()
    }
  }, [])

  const reset = useCallback(() => defaultPrompt !== null && setPrompt(defaultPrompt), [defaultPrompt, setPrompt])

  return { prompt, defaultPrompt, status, setPrompt, reset, retry: flush }
}
