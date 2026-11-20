import { SENIORITY_LEVELS } from '../models/Profile.js';

// Validates and normalises a profile payload.
// Returns { value, errors } where errors is keyed by field path, e.g. "experiences.0.company".

const LIMITS = { text: 200, url: 300, experiences: 30, education: 20, certifications: 30 };
const PHONE_RE = /^[+()\-.\s\d]{7,25}$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function intInRange(raw, min, max) {
  if (raw === '' || raw === null || raw === undefined) return { value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    return { error: `Must be a whole number from ${min} to ${max}` };
  }
  return { value: n };
}

// Accepts "github.com/me" or "https://github.com/me"; stores with a scheme.
function normaliseUrl(raw) {
  const s = str(raw);
  if (!s) return { value: '' };
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes('.')) throw new Error('no tld');
    return { value: url.href };
  } catch {
    return { error: 'Enter a valid URL' };
  }
}

export function validateProfile(body = {}) {
  const errors = {};
  const value = {};

  const text = (key, raw, { required = false, label = 'This field' } = {}) => {
    const s = str(raw);
    if (required && !s) errors[key] = `${label} is required`;
    else if (s.length > LIMITS.text) errors[key] = `Must be at most ${LIMITS.text} characters`;
    return s;
  };

  // Section 1: personal information (email is read-only and ignored here)
  value.name = text('name', body.name, { required: true, label: 'Full name' });
  value.phone = text('phone', body.phone, { required: true, label: 'Phone number' });
  if (value.phone && !errors.phone && (!PHONE_RE.test(value.phone) || value.phone.replace(/\D/g, '').length < 7)) {
    errors.phone = 'Enter a valid phone number';
  }
  value.location = text('location', body.location, { required: true, label: 'Location' });

  // Section 2: online presence
  for (const key of ['linkedin', 'github', 'website']) {
    const r = normaliseUrl(body[key]);
    if (r.error) errors[key] = r.error;
    else if (r.value.length > LIMITS.url) errors[key] = 'URL is too long';
    value[key] = r.value ?? '';
  }

  // Section 3: work experience
  const seniority = str(body.seniority);
  if (!seniority) errors.seniority = 'Seniority level is required';
  else if (!SENIORITY_LEVELS.includes(seniority)) errors.seniority = 'Choose a valid level';
  value.seniority = seniority;

  const years = intInRange(body.yearsOfExperience, 1, 20);
  if (years.error) errors.yearsOfExperience = years.error;
  else if (years.value === null) errors.yearsOfExperience = 'Years of experience is required';
  value.yearsOfExperience = years.value ?? null;

  const list = (key, max) => {
    const arr = Array.isArray(body[key]) ? body[key] : [];
    if (arr.length > max) errors[key] = `At most ${max} entries`;
    return arr.slice(0, max).map((item) => (item && typeof item === 'object' ? item : {}));
  };

  value.experiences = list('experiences', LIMITS.experiences).map((e, i) => {
    const p = `experiences.${i}`;
    const bullets = intInRange(e.bullets, 1, 20);
    if (bullets.error) errors[`${p}.bullets`] = bullets.error;
    return {
      company: text(`${p}.company`, e.company, { required: true, label: 'Company name' }),
      period: text(`${p}.period`, e.period, { required: true, label: 'Period' }),
      location: text(`${p}.location`, e.location),
      bullets: bullets.value ?? null,
    };
  });

  value.education = list('education', LIMITS.education).map((e, i) => {
    const p = `education.${i}`;
    return {
      institution: text(`${p}.institution`, e.institution, { required: true, label: 'Institution name' }),
      degree: text(`${p}.degree`, e.degree, { required: true, label: 'Degree and major' }),
      location: text(`${p}.location`, e.location),
      period: text(`${p}.period`, e.period),
    };
  });

  // Certification fields are all optional; drop rows left completely blank.
  value.certifications = list('certifications', LIMITS.certifications)
    .map((c, i) => {
      const p = `certifications.${i}`;
      return {
        institution: text(`${p}.institution`, c.institution),
        name: text(`${p}.name`, c.name),
        date: text(`${p}.date`, c.date),
      };
    })
    .filter((c) => c.institution || c.name || c.date);

  return { value, errors };
}
