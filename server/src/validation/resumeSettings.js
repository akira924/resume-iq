// Validates a resume customization payload from the Resume page.
// Returns { value, errors } where errors is keyed by field path, e.g. "fontSizes.body".
// Allowed values mirror client/src/resume/options.js — keep the two in sync.

export const FONT_FAMILIES = Object.freeze([
  'Helvetica',
  'Carlito',
  'IBM Plex Sans',
  'Inter',
  'Lato',
  'Nunito Sans',
  'Open Sans',
  'Roboto',
  'Source Sans 3',
  'Work Sans',
  'Times-Roman',
  'Crimson Pro',
  'EB Garamond',
  'Libre Baskerville',
  'Lora',
  'Merriweather',
  'PT Serif',
  'Source Serif 4',
]);

export const COLOR_THEMES = Object.freeze([
  'charcoal',
  'slate',
  'navy',
  'indigo',
  'blue',
  'ocean',
  'teal',
  'emerald',
  'forest',
  'olive',
  'brown',
  'rust',
  'crimson',
  'burgundy',
  'rose',
  'plum',
]);

export const SECTION_KEYS = Object.freeze(['skills', 'experience', 'education', 'certification']);
export const HEADER_ALIGNS = Object.freeze(['left', 'center', 'hybrid']);
export const TITLE_ALIGNS = Object.freeze(['left', 'center']);
export const ENTRY_LAYOUTS = Object.freeze([1, 2, 3, 4]);

// Inches and points; same bounds as the client inputs.
const MARGIN_RANGE = { min: 0.25, max: 1.5 };
const FONT_SIZE_RANGES = {
  name: { min: 14, max: 36 },
  headline: { min: 8, max: 20 },
  sectionTitle: { min: 8, max: 20 },
  body: { min: 7, max: 14 },
};

const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

export function validateResumeSettings(body) {
  const errors = {};
  const value = {};
  const s = isObject(body) ? body : {};

  const number = (key, raw, { min, max }) => {
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < min || raw > max) {
      errors[key] = `Must be a number from ${min} to ${max}`;
      return null;
    }
    return raw;
  };
  const oneOf = (key, raw, options) => {
    if (!options.includes(raw)) errors[key] = 'Choose a valid option';
    return raw;
  };
  const bool = (key, raw) => {
    if (typeof raw !== 'boolean') errors[key] = 'Must be true or false';
    return raw;
  };

  const margins = isObject(s.margins) ? s.margins : {};
  value.margins = {
    vertical: number('margins.vertical', margins.vertical, MARGIN_RANGE),
    horizontal: number('margins.horizontal', margins.horizontal, MARGIN_RANGE),
  };

  const order = Array.isArray(s.sectionOrder) ? s.sectionOrder : [];
  const validOrder =
    order.length === SECTION_KEYS.length && SECTION_KEYS.every((k) => order.includes(k));
  if (!validOrder) errors.sectionOrder = `Must list each of ${SECTION_KEYS.join(', ')} once`;
  value.sectionOrder = order;

  value.fontFamily = oneOf('fontFamily', s.fontFamily, FONT_FAMILIES);

  const sizes = isObject(s.fontSizes) ? s.fontSizes : {};
  value.fontSizes = Object.fromEntries(
    Object.entries(FONT_SIZE_RANGES).map(([key, range]) => [
      key,
      number(`fontSizes.${key}`, sizes[key], range),
    ]),
  );

  value.headerAlign = oneOf('headerAlign', s.headerAlign, HEADER_ALIGNS);
  value.sectionTitleAlign = oneOf('sectionTitleAlign', s.sectionTitleAlign, TITLE_ALIGNS);
  value.showBorders = bool('showBorders', s.showBorders);
  value.showContactIcons = bool('showContactIcons', s.showContactIcons);
  value.entryLayout = oneOf('entryLayout', s.entryLayout, ENTRY_LAYOUTS);
  value.theme = oneOf('theme', s.theme, COLOR_THEMES);

  return { value, errors };
}
