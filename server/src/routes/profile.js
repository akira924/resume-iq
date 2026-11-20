import { Router } from 'express';
import { DEFAULT_SENIORITY, DEFAULT_YEARS_OF_EXPERIENCE, Profile } from '../models/Profile.js';
import { requireAuth } from '../middleware/auth.js';
import { validateProfile } from '../validation/profile.js';

const router = Router();
router.use(requireAuth);

const EMPTY_PROFILE = {
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  website: '',
  seniority: DEFAULT_SENIORITY,
  yearsOfExperience: DEFAULT_YEARS_OF_EXPERIENCE,
  experiences: [],
  education: [],
  certifications: [],
};

// Name and email come from the User; the rest from the Profile (or defaults if none saved yet).
function toResponse(user, profile) {
  const p = profile ?? EMPTY_PROFILE;
  return {
    name: user.name,
    email: user.email,
    phone: p.phone,
    location: p.location,
    linkedin: p.linkedin,
    github: p.github,
    website: p.website,
    seniority: p.seniority,
    yearsOfExperience: p.yearsOfExperience,
    experiences: p.experiences.map(({ company, period, location, bullets }) => ({ company, period, location, bullets })),
    education: p.education.map(({ institution, degree, location, period }) => ({ institution, degree, location, period })),
    certifications: p.certifications.map(({ institution, name, date }) => ({ institution, name, date })),
  };
}

// GET /api/profile — the signed-in user's profile
router.get('/', async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id }).lean();
  res.json({ profile: toResponse(req.user, profile) });
});

// PUT /api/profile — replace the signed-in user's profile
router.put('/', async (req, res) => {
  const { value, errors } = validateProfile(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Please fix the highlighted fields', errors });
  }

  const { name, ...fields } = value;
  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { $set: fields },
    { upsert: true, returnDocument: 'after', runValidators: true, lean: true },
  );

  if (req.user.name !== name) {
    req.user.name = name;
    await req.user.save();
  }

  res.json({ profile: toResponse(req.user, profile), user: req.user.toPublic() });
});

export default router;
