// Adds the ResumeIQ action buttons ("Resume", "Cover letter") just above ChatGPT's
// chat input, left aligned, and a pencil "Q/A" button on the same line, right aligned.
// Buttons use the accent color of the user's resume theme.
//
// The bar is not inserted into ChatGPT's own DOM: React replaces the composer when you
// switch chats and would drop anything placed next to it. Instead the bar lives directly
// under <html> with position: fixed and follows the composer's on-screen position.
;(() => {
  const HOST_ID = 'resumeiq-actions'
  if (document.getElementById(HOST_ID)) return

  // Gap between the bottom of the buttons and the top of the chat input, in px.
  const GAP = 12

  // Sniper scope lens: outer ring, crosshair with a gap at the center, and a center dot.
  const SCOPE_ICON = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/>
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
    </svg>`

  const PENCIL_ICON = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      <path d="m15 5 4 4"/>
    </svg>`

  // `primary` is filled with the accent color; `secondary` is a light tint of it.
  const ACTIONS = [
    { id: 'resume', label: 'Resume', variant: 'primary' },
    { id: 'cover-letter', label: 'Cover letter', variant: 'secondary' },
  ]

  const log = (...args) => console.info('[ResumeIQ]', ...args)

  const host = document.createElement('div')
  host.id = HOST_ID
  host.hidden = true
  // A shadow root keeps ChatGPT's styles out of the buttons and ours out of the page.
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = `
    <style>
      :host {
        --accent: #1f3a68;
        position: fixed;
        z-index: 20;
        top: 0;
        left: 0;
        /* The host spans the composer's width; only the buttons take clicks. */
        pointer-events: none;
      }
      :host([hidden]) {
        display: none;
      }
      .bar {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .bar button {
        pointer-events: auto;
      }
      .icon-button {
        width: 28px;
        padding: 0;
        justify-content: center;
        margin-left: auto;
        flex: none;
      }
      .status {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .status {
        font: 12px/1.3 system-ui, 'Segoe UI', Roboto, sans-serif;
        color: #5d5d5d;
        white-space: nowrap;
      }
      .status.error {
        color: #b42318;
      }
      :host-context(.dark) .status {
        color: #b4b4b4;
      }
      :host-context(.dark) .status.error {
        color: #fda29b;
      }
      button:disabled {
        opacity: 0.6;
        cursor: progress;
      }
      button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        padding: 0 12px;
        border: 1px solid transparent;
        border-radius: 999px;
        font: 500 12px/1 system-ui, 'Segoe UI', Roboto, sans-serif;
        cursor: pointer;
        transition: background-color 0.15s, transform 0.1s;
      }
      button:active {
        transform: translateY(1px);
      }
      button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }

      .primary {
        background: var(--accent);
        color: #fff;
      }
      .primary:hover {
        background: color-mix(in srgb, var(--accent) 82%, #000);
      }
      .secondary {
        background: color-mix(in srgb, var(--accent) 10%, #fff);
        border-color: color-mix(in srgb, var(--accent) 45%, #fff);
        color: var(--accent);
      }
      .secondary:hover {
        background: color-mix(in srgb, var(--accent) 18%, #fff);
      }

      /* ChatGPT marks dark mode with a "dark" class on <html>. */
      :host-context(.dark) .primary {
        border-color: rgb(255 255 255 / 0.18);
      }
      :host-context(.dark) .primary:hover {
        background: color-mix(in srgb, var(--accent) 82%, #fff);
      }
      :host-context(.dark) .secondary {
        background: color-mix(in srgb, var(--accent) 22%, #212121);
        border-color: color-mix(in srgb, var(--accent) 55%, #fff);
        color: color-mix(in srgb, var(--accent) 35%, #fff);
      }
      :host-context(.dark) .secondary:hover {
        background: color-mix(in srgb, var(--accent) 34%, #212121);
      }
    </style>
    <div class="bar" role="toolbar" aria-label="ResumeIQ">
      ${ACTIONS.map(
        (a) =>
          `<button type="button" class="${a.variant}" data-action="${a.id}">${SCOPE_ICON}<span>${a.label}</span></button>`,
      ).join('')}
      <span class="status" role="status" aria-live="polite"></span>
      <button type="button" class="primary icon-button" data-action="qa"
              aria-label="Q/A prompt" title="Q/A prompt">${PENCIL_ICON}</button>
    </div>
  `

  const statusEl = root.querySelector('.status')
  let statusTimer = 0
  function setStatus(text, { error = false, sticky = false } = {}) {
    clearTimeout(statusTimer)
    statusEl.textContent = text
    statusEl.classList.toggle('error', error)
    if (text && !sticky) statusTimer = setTimeout(() => setStatus(''), 5000)
  }

  const ACTION_HANDLERS = {
    resume: sendResumePrompt,
    'cover-letter': sendCoverLetterPrompt,
    qa: sendQaPrompt,
  }

  let busy = false
  root.addEventListener('click', async (e) => {
    const button = e.target.closest('button[data-action]')
    if (!button) return
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    busy = true
    root.querySelectorAll('button').forEach((b) => (b.disabled = true))
    try {
      await ACTION_HANDLERS[button.dataset.action]?.()
    } catch (err) {
      log('action failed', err)
      setStatus(err.message || 'Something went wrong.', { error: true })
    } finally {
      busy = false
      root.querySelectorAll('button').forEach((b) => (b.disabled = false))
    }
  })

  // ---- Actions ----

  // Resume: prompt + job description from the clipboard.
  async function sendResumePrompt() {
    setStatus('Preparing…', { sticky: true })
    // Read the clipboard first, while the click still counts as a user gesture.
    const jobDescription = (await readClipboard()).trim()
    if (!jobDescription) {
      throw new Error('Clipboard is empty. Copy the job description first.')
    }
    const prompt = await getPrompt('resumePrompt')
    // The prefetched prompt ends with the "JOB DESCRIPTION" heading; the posting goes under it.
    await sendPrompt(`${prompt}\n${jobDescription}`)
  }

  // Cover letter: the prompt alone. It's meant to follow the resume prompt in the same
  // chat, where ChatGPT already has the job description.
  async function sendCoverLetterPrompt() {
    setStatus('Preparing…', { sticky: true })
    await sendPrompt(await getPrompt('coverLetterPrompt'))
  }

  // Q/A: the user's saved Q/A prompt alone, also meant to follow the resume prompt.
  async function sendQaPrompt() {
    setStatus('Preparing…', { sticky: true })
    await sendPrompt(await getPrompt('qaPrompt'))
  }

  // A prefetched prompt from the context, loading it now if the prefetch hadn't finished.
  async function getPrompt(key) {
    if (!context?.[key]) await loadContext()
    if (!context?.[key]) throw new Error(context?.error || 'Could not load your ResumeIQ profile.')
    return context[key]
  }

  // Puts `text` in ChatGPT's main input and presses Enter.
  async function sendPrompt(text) {
    const input = findComposer()?.input
    if (!input) throw new Error('Could not find the ChatGPT input.')
    if (document.querySelector('[data-testid="stop-button"]')) {
      throw new Error('ChatGPT is still responding. Wait for it to finish, then try again.')
    }
    setComposerText(input, text)
    await submit(input)
    setStatus('Sent.')
  }

  // With the "clipboardRead" permission, execCommand('paste') reads the clipboard without a
  // prompt. navigator.clipboard is the fallback; Chrome may ask the user to allow it.
  async function readClipboard() {
    const active = document.activeElement
    const area = document.createElement('textarea')
    area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;'
    document.documentElement.append(area)
    area.focus()
    let text = ''
    try {
      if (document.execCommand('paste')) text = area.value
    } finally {
      area.remove()
      active?.focus?.()
    }
    if (text) return text
    try {
      return await navigator.clipboard.readText()
    } catch {
      throw new Error('Could not read the clipboard. Allow clipboard access and try again.')
    }
  }

  // Replaces the input's content. ChatGPT's editor is ProseMirror, which picks up DOM
  // changes and parses one <p> per line. This avoids a paste event, which ChatGPT would
  // turn into a "Pasted text" attachment for long text.
  function setComposerText(input, text) {
    input.focus()
    if (input instanceof HTMLTextAreaElement) {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
      setValue.call(input, text)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      return
    }
    const paragraphs = text.split('\n').map((line) => {
      const p = document.createElement('p')
      if (line) p.textContent = line
      else p.append(document.createElement('br'))
      return p
    })
    input.replaceChildren(...paragraphs)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
  }

  const nextFrame = () => new Promise((r) => requestAnimationFrame(r))

  // Sends the message by pressing Enter in the input, as a user would.
  async function submit(input) {
    // Give ChatGPT's editor two frames to take in the new text, or Enter sends nothing.
    await nextFrame()
    await nextFrame()
    input.focus()
    const init = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }
    input.dispatchEvent(new KeyboardEvent('keydown', init))
    input.dispatchEvent(new KeyboardEvent('keyup', init))
  }

  // ---- Positioning ----

  // The buttons always belong to ChatGPT's main chat box: the one with the "+" (attach)
  // button and the #prompt-textarea editor. Other text boxes on the page, such as the
  // one that opens when you edit an earlier message, are ignored.
  const MAIN_COMPOSER_SELECTORS = ['form[data-type="unified-composer"]']
  const MAIN_INPUT_SELECTORS = ['#prompt-textarea', '[data-testid="prompt-textarea"]']
  const PLUS_BUTTON_SELECTORS = [
    '[data-testid="composer-plus-btn"]',
    'button[aria-label="Add photos & files"]',
    'button[aria-label*="Add files"]',
  ]
  // Inside the main composer, whatever the editor element happens to be.
  const EDITOR_SELECTORS = [...MAIN_INPUT_SELECTORS, '[contenteditable="true"]', 'textarea']

  const isVisible = (el) => el.getClientRects().length > 0
  const firstVisible = (selectors, scope = document) =>
    [...scope.querySelectorAll(selectors.join(','))].find(isVisible) ?? null

  // Returns the main chat box (`composer`) and its editor (`input`), or null.
  // Only visible elements count, so a hidden copy left over from the previous chat is skipped.
  function findComposer() {
    const composer =
      firstVisible(MAIN_COMPOSER_SELECTORS) ??
      firstVisible(MAIN_INPUT_SELECTORS)?.closest('form') ??
      firstVisible(PLUS_BUTTON_SELECTORS)?.closest('form')
    if (!composer) return null
    const input = firstVisible(EDITOR_SELECTORS, composer)
    return input ? { input, composer } : null
  }

  let lastStatus = ''
  function report(status) {
    if (status === lastStatus) return
    lastStatus = status
    log(status)
  }

  // Put the bar just above the composer, as wide as it, or hide it when there is none.
  function place() {
    if (!host.isConnected) document.documentElement.append(host)
    const rect = findComposer()?.composer.getBoundingClientRect()
    if (!rect || rect.width === 0) {
      host.hidden = true
      return report('composer not found')
    }
    host.hidden = false
    host.style.width = `${Math.round(rect.width)}px`
    const top = Math.max(0, rect.top - host.offsetHeight - GAP)
    host.style.transform = `translate(${Math.round(rect.left)}px, ${Math.round(top)}px)`
    report('buttons shown')
  }

  // Re-place once per frame at most, whenever something could have moved the composer:
  // DOM changes (switching chats, the input growing), scrolling and resizing.
  let scheduled = false
  function schedule() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      place()
    })
  }
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  })
  addEventListener('resize', schedule)
  addEventListener('scroll', schedule, { capture: true, passive: true })
  // Safety net for layout changes that none of the above report (e.g. CSS transitions).
  setInterval(schedule, 500)
  place()

  // ---- Prefetched data: theme color and resume prompt ----

  // { accent, resumePrompt, coverLetterPrompt, qaPrompt, error } from the background worker.
  let context = null

  async function loadContext() {
    try {
      context = await chrome.runtime.sendMessage({ type: 'resumeiq:get-context' })
      if (context?.accent) host.style.setProperty('--accent', context.accent)
    } catch {
      // Extension reloaded or service worker unavailable: keep what we had.
    }
  }

  // Pick up profile or theme changes made in the web app when the user comes back to this tab.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadContext()
  })
  loadContext()
})()
