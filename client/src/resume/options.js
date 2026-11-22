// Choices and defaults for the Resume page's customization panel.

// `value` is the family name the PDF renderer knows (see fonts.js); `group` sorts the picker.
// `charWidth` is the font's average glyph advance as a fraction of the font size, measured with
// fontkit over typical contact text (emails, phone numbers, URLs, places). The layout uses it to
// estimate line widths, since react-pdf can't measure text before layout. Helvetica and Times
// were measured from their metric-compatible twins, Arial and Times New Roman.
export const FONT_GROUPS = ['Sans-serif', 'Serif']
export const FONT_FAMILIES = [
  { value: 'Helvetica', label: 'Helvetica', group: 'Sans-serif', charWidth: 0.48 },
  { value: 'Carlito', label: 'Carlito (Calibri-like)', group: 'Sans-serif', charWidth: 0.436 },
  { value: 'IBM Plex Sans', label: 'IBM Plex Sans', group: 'Sans-serif', charWidth: 0.485 },
  { value: 'Inter', label: 'Inter', group: 'Sans-serif', charWidth: 0.51 },
  { value: 'Lato', label: 'Lato', group: 'Sans-serif', charWidth: 0.467 },
  { value: 'Nunito Sans', label: 'Nunito Sans', group: 'Sans-serif', charWidth: 0.482 },
  { value: 'Open Sans', label: 'Open Sans', group: 'Sans-serif', charWidth: 0.499 },
  { value: 'Roboto', label: 'Roboto', group: 'Sans-serif', charWidth: 0.481 },
  { value: 'Source Sans 3', label: 'Source Sans 3', group: 'Sans-serif', charWidth: 0.447 },
  { value: 'Work Sans', label: 'Work Sans', group: 'Sans-serif', charWidth: 0.521 },
  { value: 'Times-Roman', label: 'Times', group: 'Serif', charWidth: 0.439 },
  { value: 'Crimson Pro', label: 'Crimson Pro', group: 'Serif', charWidth: 0.429 },
  { value: 'EB Garamond', label: 'EB Garamond', group: 'Serif', charWidth: 0.414 },
  { value: 'Libre Baskerville', label: 'Libre Baskerville', group: 'Serif', charWidth: 0.553 },
  { value: 'Lora', label: 'Lora', group: 'Serif', charWidth: 0.502 },
  { value: 'Merriweather', label: 'Merriweather', group: 'Serif', charWidth: 0.517 },
  { value: 'PT Serif', label: 'PT Serif', group: 'Serif', charWidth: 0.48 },
  { value: 'Source Serif 4', label: 'Source Serif 4', group: 'Serif', charWidth: 0.509 },
]
const DEFAULT_CHAR_WIDTH = 0.5
export const charWidthOf = (fontFamily) =>
  FONT_FAMILIES.find((f) => f.value === fontFamily)?.charWidth ?? DEFAULT_CHAR_WIDTH

// Accent color: full name, section titles, and the leading company/job title of each entry.
// Every color keeps at least 4.5:1 contrast against white so accented text stays readable in print.
export const COLOR_THEMES = [
  { value: 'charcoal', label: 'Charcoal', color: '#1f2328' },
  { value: 'slate', label: 'Slate', color: '#475569' },
  { value: 'navy', label: 'Navy', color: '#1f3a68' },
  { value: 'indigo', label: 'Indigo', color: '#3730a3' },
  { value: 'blue', label: 'Blue', color: '#1d5fbf' },
  { value: 'ocean', label: 'Ocean', color: '#0b5f8a' },
  { value: 'teal', label: 'Teal', color: '#0f6e68' },
  { value: 'emerald', label: 'Emerald', color: '#047857' },
  { value: 'forest', label: 'Forest', color: '#2f6b3a' },
  { value: 'olive', label: 'Olive', color: '#556b2f' },
  { value: 'brown', label: 'Brown', color: '#7a4b26' },
  { value: 'rust', label: 'Rust', color: '#a4471c' },
  { value: 'crimson', label: 'Crimson', color: '#b0263a' },
  { value: 'burgundy', label: 'Burgundy', color: '#8b1e3f' },
  { value: 'rose', label: 'Rose', color: '#a23b5d' },
  { value: 'plum', label: 'Plum', color: '#6b2f8a' },
]

// Rule color for a theme: the accent blended toward white until it sits at a fixed contrast
// against the page. Dark accents get a lighter tint and light accents a deeper one, so the
// line looks equally prominent under every theme while still matching its hue.
const RULE_CONTRAST = 2.4

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const rgbToHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrastWithWhite = (rgb) => 1.05 / (luminance(rgb) + 0.05)

export function ruleColor(accentHex) {
  const accent = hexToRgb(accentHex)
  if (contrastWithWhite(accent) <= RULE_CONTRAST) return accentHex
  const mix = (t) => accent.map((c) => c + (255 - c) * t) // t = share of white
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (contrastWithWhite(mix(mid)) > RULE_CONTRAST) lo = mid
    else hi = mid
  }
  return rgbToHex(mix(lo))
}

export const themeColors = (theme) => {
  const accent = (COLOR_THEMES.find((t) => t.value === theme) ?? COLOR_THEMES[0]).color
  return { accent, rule: ruleColor(accent) }
}

export const SECTIONS = {
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  certification: 'Certifications',
}

export const HEADER_ALIGNS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'hybrid', label: 'Hybrid' },
]

export const TITLE_ALIGNS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
]

// The company-entry layouts. `accent` is the field drawn in the accent color.
export const ENTRY_LAYOUTS = [
  { value: 1, label: 'Title first', hint: 'Title · Period / Company · Location', accent: 'title' },
  { value: 2, label: 'Company first', hint: 'Company · Location / Title · Period', accent: 'company' },
  { value: 3, label: 'Stacked', hint: 'Company - Title / Period | Location', accent: 'company' },
  { value: 4, label: 'One line', hint: 'Company - Title · Period | Location', accent: 'company' },
]

// Font sizes in points; `min`/`max` bound the inputs.
export const FONT_SIZE_FIELDS = [
  { key: 'name', label: 'Full name', min: 14, max: 36 },
  { key: 'headline', label: 'Headline', min: 8, max: 20 },
  { key: 'sectionTitle', label: 'Section titles', min: 8, max: 20 },
  { key: 'body', label: 'Other text', min: 7, max: 14 },
]

// Page margins in inches.
export const MARGIN_RANGE = { min: 0.25, max: 1.5, step: 0.05 }

export const DEFAULT_SETTINGS = {
  margins: { vertical: 0.6, horizontal: 0.7 },
  sectionOrder: ['skills', 'experience', 'education', 'certification'],
  fontFamily: 'Helvetica',
  fontSizes: { name: 22, headline: 11.5, sectionTitle: 11.5, body: 10 },
  headerAlign: 'left',
  sectionTitleAlign: 'left',
  showBorders: true,
  showContactIcons: false,
  entryLayout: 1,
  theme: 'navy',
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
const oneOf = (value, options, fallback) => (options.some((o) => o.value === value) ? value : fallback)

// Fills in / corrects settings loaded from storage so a stale or hand-edited value can't break the page.
export function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const d = DEFAULT_SETTINGS
  const num = (v, fallback, min, max) => (Number.isFinite(v) ? clamp(v, min, max) : fallback)

  const order = Array.isArray(s.sectionOrder) ? s.sectionOrder : []
  const keys = Object.keys(SECTIONS)
  const validOrder = order.length === keys.length && keys.every((k) => order.includes(k))

  return {
    margins: {
      vertical: num(s.margins?.vertical, d.margins.vertical, MARGIN_RANGE.min, MARGIN_RANGE.max),
      horizontal: num(s.margins?.horizontal, d.margins.horizontal, MARGIN_RANGE.min, MARGIN_RANGE.max),
    },
    sectionOrder: validOrder ? [...order] : [...d.sectionOrder],
    fontFamily: oneOf(s.fontFamily, FONT_FAMILIES, d.fontFamily),
    fontSizes: Object.fromEntries(
      FONT_SIZE_FIELDS.map(({ key, min, max }) => [key, num(s.fontSizes?.[key], d.fontSizes[key], min, max)]),
    ),
    headerAlign: oneOf(s.headerAlign, HEADER_ALIGNS, d.headerAlign),
    sectionTitleAlign: oneOf(s.sectionTitleAlign, TITLE_ALIGNS, d.sectionTitleAlign),
    showBorders: typeof s.showBorders === 'boolean' ? s.showBorders : d.showBorders,
    showContactIcons: typeof s.showContactIcons === 'boolean' ? s.showContactIcons : d.showContactIcons,
    entryLayout: oneOf(s.entryLayout, ENTRY_LAYOUTS, d.entryLayout),
    theme: oneOf(s.theme, COLOR_THEMES, d.theme),
  }
}

const str = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const list = (v) => (Array.isArray(v) ? v : [])
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

// Turns parsed resume JSON into a predictable shape: missing fields become '' / [].
// Throws if the root isn't an object.
export function normalizeResume(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The resume JSON must be an object, e.g. { "personal_info": { … } }.')
  }
  const info = obj(data.personal_info)
  return {
    name: str(info.name),
    email: str(info.email),
    phone: str(info.phone),
    location: str(info.location),
    headline: str(data.headline),
    links: Object.entries(obj(data.online_presence))
      .map(([key, url]) => ({ key, url: str(url) }))
      .filter((l) => l.url),
    summary: str(data.summary),
    skillsets: list(data.skillsets)
      .map((s) => ({ category: str(s?.category), skills: list(s?.skills).map(str).filter(Boolean) }))
      .filter((s) => s.category || s.skills.length),
    experience: list(data.experience).map((e) => ({
      company: str(e?.company),
      location: str(e?.location),
      title: str(e?.title),
      period: str(e?.period),
      roleDescription: str(e?.role_description),
      sentences: list(e?.sentences).map(str).filter(Boolean),
      usedSkills: list(e?.used_skills).map(str).filter(Boolean),
    })),
    education: list(data.education).map((e) => ({
      institution: str(e?.institution),
      degree: str(e?.major_degree),
      period: str(e?.period),
    })),
    certification: list(data.certification).map((c) => ({
      name: str(c?.name),
      institution: str(c?.institution),
      date: str(c?.date),
    })),
  }
}
