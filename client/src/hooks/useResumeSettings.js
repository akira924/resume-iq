import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { DEFAULT_SETTINGS, normalizeSettings } from '../resume/options'

const SAVE_DELAY_MS = 600
// Where settings lived before they were saved on the server; moved over once, then removed.
const LEGACY_KEY = 'resumeBuilder.settings'

function takeLegacySettings() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    localStorage.removeItem(LEGACY_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function putSettings(settings, options) {
  return api('/resume-settings', { method: 'PUT', body: settings, ...options })
}

// The signed-in user's resume customization, loaded from and autosaved to the server.
// `settings` is null until loaded. `status` is one of:
//   loading | load-error | idle | saving | saved | save-error
// After a load error nothing is saved, so the defaults shown can't overwrite saved settings.
export function useResumeSettings() {
  const [settings, setSettingsState] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)

  const canSave = useRef(false)
  const unsaved = useRef(null) // latest settings not yet sent to the server
  const timer = useRef(null)
  const saveSeq = useRef(0)

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const next = unsaved.current
    if (!next || !canSave.current) return
    unsaved.current = null
    const seq = ++saveSeq.current
    setStatus('saving')
    try {
      await putSettings(next)
      if (seq === saveSeq.current) setStatus('saved')
    } catch {
      if (seq === saveSeq.current) {
        if (!unsaved.current) unsaved.current = next // keep it for retry
        setStatus('save-error')
      }
    }
  }, [])

  const scheduleSave = useCallback(
    (next) => {
      if (!canSave.current) return
      unsaved.current = next
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DELAY_MS)
    },
    [flush],
  )

  const setSettings = useCallback(
    (update) => {
      setSettingsState((prev) => {
        const next = typeof update === 'function' ? update(prev) : update
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  // Load (and retry on request).
  useEffect(() => {
    let cancelled = false
    api('/resume-settings')
      .then(({ settings: saved }) => {
        if (cancelled) return
        canSave.current = true
        if (saved) {
          setSettingsState(normalizeSettings(saved))
          setStatus('idle')
          return
        }
        const legacy = takeLegacySettings()
        const initial = normalizeSettings(legacy ?? DEFAULT_SETTINGS)
        setSettingsState(initial)
        setStatus('idle')
        if (legacy) scheduleSave(initial)
      })
      .catch(() => {
        if (cancelled) return
        canSave.current = false
        setSettingsState((prev) => prev ?? normalizeSettings(DEFAULT_SETTINGS))
        setStatus('load-error')
      })
    return () => {
      cancelled = true
    }
  }, [loadAttempt, scheduleSave])

  // Don't drop a pending save when leaving the page or closing the tab.
  useEffect(() => {
    const sendNow = () => {
      clearTimeout(timer.current)
      if (unsaved.current && canSave.current) {
        putSettings(unsaved.current, { keepalive: true }).catch(() => {})
        unsaved.current = null
      }
    }
    window.addEventListener('pagehide', sendNow)
    return () => {
      window.removeEventListener('pagehide', sendNow)
      sendNow()
    }
  }, [])

  const retry = useCallback(() => {
    if (status === 'load-error') {
      setStatus('loading')
      setLoadAttempt((n) => n + 1)
    } else flush()
  }, [status, flush])

  return { settings, setSettings, status, retry }
}
