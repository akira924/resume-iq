// Copy of the resume color themes in client/src/resume/options.js (the extension has
// no build step, so it can't import from the client). Keep the two lists in sync.
export const COLOR_THEMES = {
  charcoal: '#1f2328',
  slate: '#475569',
  navy: '#1f3a68',
  indigo: '#3730a3',
  blue: '#1d5fbf',
  ocean: '#0b5f8a',
  teal: '#0f6e68',
  emerald: '#047857',
  forest: '#2f6b3a',
  olive: '#556b2f',
  brown: '#7a4b26',
  rust: '#a4471c',
  crimson: '#b0263a',
  burgundy: '#8b1e3f',
  rose: '#a23b5d',
  plum: '#6b2f8a',
}

// Same default as DEFAULT_SETTINGS.theme in the client.
export const DEFAULT_THEME = 'navy'

export const themeAccent = (theme) => COLOR_THEMES[theme] ?? COLOR_THEMES[DEFAULT_THEME]
