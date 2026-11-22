import { useCallback, useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import CodeMirror from '@uiw/react-codemirror'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter, lintGutter } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import ResumeDocument from '../resume/ResumeDocument'
import PdfPreview from '../resume/PdfPreview'
import { SAMPLE_RESUME } from '../resume/sampleResume'
import { useResumeSettings } from '../hooks/useResumeSettings'
import {
  COLOR_THEMES,
  DEFAULT_SETTINGS,
  ENTRY_LAYOUTS,
  FONT_FAMILIES,
  FONT_GROUPS,
  FONT_SIZE_FIELDS,
  HEADER_ALIGNS,
  MARGIN_RANGE,
  SECTIONS,
  TITLE_ALIGNS,
  normalizeResume,
  normalizeSettings,
} from '../resume/options'

const JSON_KEY = 'resumeBuilder.json'
const SAMPLE_TEXT = JSON.stringify(SAMPLE_RESUME, null, 2)
const RENDER_DELAY_MS = 300

// JSON editor: syntax highlighting + inline parse errors. Colors are the --json-* CSS
// variables in index.css, so the editor follows the app's light/dark mode.
const JSON_HIGHLIGHT = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--json-key)' },
  { tag: tags.string, color: 'var(--json-string)' },
  { tag: tags.number, color: 'var(--json-number)' },
  { tag: [tags.bool, tags.null], color: 'var(--json-keyword)' },
  { tag: [tags.separator, tags.squareBracket, tags.brace, tags.punctuation], color: 'var(--json-punct)' },
])
const EDITOR_EXTENSIONS = [
  json(),
  syntaxHighlighting(JSON_HIGHLIGHT),
  linter(jsonParseLinter()),
  lintGutter(),
  EditorView.lineWrapping,
]
const EDITOR_SETUP = {
  foldGutter: true,
  highlightActiveLine: true,
  autocompletion: false,
  syntaxHighlighting: false, // replaced by JSON_HIGHLIGHT
}

// Storage is a convenience: it may be unavailable (private mode, blocked site data).
function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

// -> { resume } or { error }
function parseResume(text) {
  try {
    return { resume: normalizeResume(JSON.parse(text)) }
  } catch (err) {
    return { error: err instanceof SyntaxError ? `Invalid JSON: ${err.message}` : err.message }
  }
}

function fileName(resume) {
  const base = resume?.name?.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
  return `${base || 'Resume'}_Resume.pdf`
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="segmented-item"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ControlGroup({ title, children }) {
  return (
    <div className="rb-group">
      <h3 className="rb-group-title">{title}</h3>
      {children}
    </div>
  )
}

function MarginSlider({ id, label, value, onChange }) {
  return (
    <div className="rb-slider">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={MARGIN_RANGE.min}
        max={MARGIN_RANGE.max}
        step={MARGIN_RANGE.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output htmlFor={id}>{value.toFixed(2)} in</output>
    </div>
  )
}

// Number input that lets the user type freely and applies only values in range.
function FontSizeInput({ id, label, value, min, max, onChange }) {
  const [draft, setDraft] = useState(null) // text being typed, null when not editing
  return (
    <div className="rb-size">
      <label htmlFor={id}>{label}</label>
      <span className="rb-size-input">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={0.5}
          value={draft ?? value}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value !== '' && n >= min && n <= max) onChange(n)
          }}
          onBlur={() => setDraft(null)}
        />
        <span className="muted">pt</span>
      </span>
    </div>
  )
}

function Customization({ settings, setSettings }) {
  const update = (patch) => setSettings((s) => ({ ...s, ...patch }))
  const setMargin = (key, v) => setSettings((s) => ({ ...s, margins: { ...s.margins, [key]: v } }))
  const setFontSize = (key, v) => setSettings((s) => ({ ...s, fontSizes: { ...s.fontSizes, [key]: v } }))
  const move = (index, delta) =>
    setSettings((s) => {
      const order = [...s.sectionOrder]
      const target = index + delta
      if (target < 0 || target >= order.length) return s
      ;[order[index], order[target]] = [order[target], order[index]]
      return { ...s, sectionOrder: order }
    })

  return (
    <div className="rb-controls">
      <ControlGroup title="Page">
        <p className="muted">US Letter · 8.5 × 11 in</p>
        <MarginSlider
          id="rb-margin-v"
          label="Top & bottom margin"
          value={settings.margins.vertical}
          onChange={(v) => setMargin('vertical', v)}
        />
        <MarginSlider
          id="rb-margin-h"
          label="Left & right margin"
          value={settings.margins.horizontal}
          onChange={(v) => setMargin('horizontal', v)}
        />
      </ControlGroup>

      <ControlGroup title="Section order">
        <ol className="rb-order">
          {settings.sectionOrder.map((key, i) => (
            <li key={key}>
              <span className="rb-order-index">{i + 1}</span>
              <span className="rb-order-label">{SECTIONS[key]}</span>
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${SECTIONS[key]} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${SECTIONS[key]} down`}
                disabled={i === settings.sectionOrder.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
        <p className="field-hint">Summary always follows the header.</p>
      </ControlGroup>

      <ControlGroup title="Typography">
        <div className="field">
          <label htmlFor="rb-font">Font family</label>
          <select id="rb-font" value={settings.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })}>
            {FONT_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {FONT_FAMILIES.filter((f) => f.group === group).map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="rb-sizes">
          {FONT_SIZE_FIELDS.map((f) => (
            <FontSizeInput
              key={f.key}
              id={`rb-size-${f.key}`}
              label={f.label}
              min={f.min}
              max={f.max}
              value={settings.fontSizes[f.key]}
              onChange={(v) => setFontSize(f.key, v)}
            />
          ))}
        </div>
      </ControlGroup>

      <ControlGroup title="Header">
        <Segmented
          label="Header alignment"
          options={HEADER_ALIGNS}
          value={settings.headerAlign}
          onChange={(v) => update({ headerAlign: v })}
        />
        {settings.headerAlign === 'hybrid' && (
          <p className="field-hint">Name and headline on the left, contact details on the right.</p>
        )}
        <label className="rb-toggle">
          <input
            type="checkbox"
            role="switch"
            checked={settings.showContactIcons}
            onChange={(e) => update({ showContactIcons: e.target.checked })}
          />
          Icons for contact details and links
        </label>
      </ControlGroup>

      <ControlGroup title="Section titles">
        <Segmented
          label="Section title alignment"
          options={TITLE_ALIGNS}
          value={settings.sectionTitleAlign}
          onChange={(v) => update({ sectionTitleAlign: v })}
        />
        <label className="rb-toggle">
          <input
            type="checkbox"
            role="switch"
            checked={settings.showBorders}
            onChange={(e) => update({ showBorders: e.target.checked })}
          />
          Border line under section titles
        </label>
      </ControlGroup>

      <ControlGroup title="Company entry">
        <div className="rb-choices" role="radiogroup" aria-label="Company entry layout">
          {ENTRY_LAYOUTS.map((l) => (
            <label key={l.value} className="rb-choice">
              <input
                type="radio"
                name="rb-entry"
                checked={settings.entryLayout === l.value}
                onChange={() => update({ entryLayout: l.value })}
              />
              <span>
                <span className="rb-choice-label">
                  {l.value}. {l.label}
                </span>
                <span className="field-hint">{l.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </ControlGroup>

      <ControlGroup title="Color theme">
        <div className="rb-swatches" role="group" aria-label="Accent color">
          {COLOR_THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              className="rb-swatch"
              aria-pressed={settings.theme === t.value}
              title={t.label}
              onClick={() => update({ theme: t.value })}
            >
              <span className="rb-swatch-dot" style={{ background: t.color }} />
              <span className="rb-swatch-label">{t.label}</span>
            </button>
          ))}
        </div>
      </ControlGroup>

      <button type="button" className="secondary small" onClick={() => setSettings(normalizeSettings(DEFAULT_SETTINGS))}>
        Reset customization
      </button>
    </div>
  )
}

const SAVE_STATUS_TEXT = {
  saving: 'Saving…',
  saved: 'Saved',
  'save-error': 'Couldn’t save',
  'load-error': 'Not loaded',
}

// Autosave state for the customization panel, with a retry after a failure.
function SaveStatus({ status, onRetry }) {
  const failed = status === 'save-error' || status === 'load-error'
  return (
    <span className="rb-panel-actions">
      <span className="muted" aria-live="polite">
        {SAVE_STATUS_TEXT[status] ?? ''}
      </span>
      {failed && (
        <button type="button" className="secondary small" onClick={onRetry}>
          Retry
        </button>
      )}
    </span>
  )
}

// Resume builder: paste resume JSON, customize the layout, preview and download the PDF.
export default function ResumeBuilder() {
  const [jsonText, setJsonText] = useState(() => readStorage(JSON_KEY) ?? SAMPLE_TEXT)
  const [parsed, setParsed] = useState(() => parseResume(jsonText))
  // The last valid resume keeps the preview up while the JSON is mid-edit.
  const [resume, setResume] = useState(() => parsed.resume ?? parseResume(SAMPLE_TEXT).resume)
  const { settings, setSettings, status: settingsStatus, retry: retrySettings } = useResumeSettings()
  const [blob, setBlob] = useState(null)
  const [renderError, setRenderError] = useState('')
  const [rendering, setRendering] = useState(true)

  function changeJson(text) {
    setJsonText(text)
    const result = parseResume(text)
    setParsed(result)
    if (result.resume) setResume(result.resume)
  }

  useEffect(() => writeStorage(JSON_KEY, jsonText), [jsonText])

  // Rebuild the PDF shortly after the last change, not on every keystroke.
  // Waits for the saved settings so the preview doesn't flash the defaults first.
  useEffect(() => {
    if (!settings) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setRendering(true)
      try {
        const next = await pdf(<ResumeDocument resume={resume} settings={settings} />).toBlob()
        if (!cancelled) {
          setBlob(next)
          setRenderError('')
        }
      } catch (err) {
        if (!cancelled) setRenderError(err.message || 'Couldn’t build the PDF.')
      } finally {
        if (!cancelled) setRendering(false)
      }
    }, RENDER_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [resume, settings])

  // ARIA attributes belong on the editable element, not the editor's wrapper.
  const hasJsonError = Boolean(parsed.error)
  const editorExtensions = useMemo(
    () => [
      ...EDITOR_EXTENSIONS,
      EditorView.contentAttributes.of({
        'aria-label': 'Resume JSON',
        'aria-invalid': String(hasJsonError),
        ...(hasJsonError && { 'aria-describedby': 'rb-json-error' }),
      }),
    ],
    [hasJsonError],
  )

  const onPreviewError = useCallback((err) => setRenderError(err.message || 'Couldn’t show the preview.'), [])

  function download() {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName(resume)
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function formatJson() {
    if (parsed.resume) changeJson(JSON.stringify(JSON.parse(jsonText), null, 2))
  }

  return (
    <section className="rb-page">
      <header className="rb-header">
        <div className="page-header">
          <h1>Resume</h1>
          <p className="muted">Paste your resume JSON, tune the layout, and download a US Letter PDF.</p>
        </div>
        <button type="button" onClick={download} disabled={!blob}>
          Download PDF
        </button>
      </header>

      <div className="rb-body">
        <section className="rb-panel rb-json" aria-labelledby="rb-json-title">
          <div className="rb-panel-header">
            <h2 id="rb-json-title">JSON</h2>
            <div className="rb-panel-actions">
              <button type="button" className="secondary small" onClick={formatJson} disabled={!parsed.resume}>
                Format
              </button>
              <button
                type="button"
                className="secondary small"
                onClick={() => changeJson(SAMPLE_TEXT)}
                disabled={jsonText === SAMPLE_TEXT}
              >
                Load sample
              </button>
            </div>
          </div>
          <CodeMirror
            className={`rb-json-editor${hasJsonError ? ' has-error' : ''}`}
            value={jsonText}
            onChange={changeJson}
            extensions={editorExtensions}
            basicSetup={EDITOR_SETUP}
            theme="none"
            height="100%"
          />
          {parsed.error && (
            <p id="rb-json-error" className="alert alert-error" role="alert">
              {parsed.error} The preview shows the last valid version.
            </p>
          )}
        </section>

        <section className="rb-panel rb-preview" aria-labelledby="rb-preview-title">
          <div className="rb-panel-header">
            <h2 id="rb-preview-title">Preview</h2>
            <span className="muted" aria-live="polite">
              {rendering ? 'Updating…' : ''}
            </span>
          </div>
          {renderError && (
            <p className="alert alert-error" role="alert">
              {renderError}
            </p>
          )}
          <div className="rb-preview-scroll">
            <PdfPreview blob={blob} onError={onPreviewError} />
          </div>
        </section>

        <section className="rb-panel rb-customize" aria-labelledby="rb-customize-title">
          <div className="rb-panel-header">
            <h2 id="rb-customize-title">Customize</h2>
            <SaveStatus status={settingsStatus} onRetry={retrySettings} />
          </div>
          {settingsStatus === 'load-error' && (
            <p className="alert alert-error" role="alert">
              Couldn’t load your saved customization. Changes made now won’t be saved.
            </p>
          )}
          {settings ? (
            <Customization settings={settings} setSettings={setSettings} />
          ) : (
            <p className="muted">Loading…</p>
          )}
        </section>
      </div>
    </section>
  )
}
