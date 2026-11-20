// Choices and defaults for the Resume page's customization panel.

// `value` is the family name the PDF renderer knows (see fonts.js).
export const FONT_FAMILIES = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times-Roman', label: 'Times' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Source Sans 3', label: 'Source Sans 3' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'EB Garamond', label: 'EB Garamond' },
]

// Accent color: full name, section titles, and the leading company/job title of each entry.
export const COLOR_THEMES = [
  { value: 'charcoal', label: 'Charcoal', color: '#1f2328' },
  { value: 'navy', label: 'Navy', color: '#1f3a68' },
  { value: 'blue', label: 'Blue', color: '#1d5fbf' },
  { value: 'teal', label: 'Teal', color: '#0f6e68' },
  { value: 'forest', label: 'Forest', color: '#2f6b3a' },
  { value: 'burgundy', label: 'Burgundy', color: '#8b1e3f' },
  { value: 'plum', label: 'Plum', color: '#6b2f8a' },
  { value: 'slate', label: 'Slate', color: '#475569' },
]

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
      sentences: list(e?.sentences).map(str).filter(Boolean),
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
