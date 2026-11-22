import { Router } from 'express';
import { ResumeSettings } from '../models/ResumeSettings.js';
import { requireAuth } from '../middleware/auth.js';
import { validateResumeSettings } from '../validation/resumeSettings.js';

const router = Router();
router.use(requireAuth);

function toResponse(doc) {
  if (!doc) return null;
  const { margins, sectionOrder, fontFamily, fontSizes, headerAlign, sectionTitleAlign } = doc;
  const { showBorders, showContactIcons, entryLayout, theme } = doc;
  return {
    margins: { vertical: margins.vertical, horizontal: margins.horizontal },
    sectionOrder: [...sectionOrder],
    fontFamily,
    fontSizes: {
      name: fontSizes.name,
      headline: fontSizes.headline,
      sectionTitle: fontSizes.sectionTitle,
      body: fontSizes.body,
    },
    headerAlign,
    sectionTitleAlign,
    showBorders,
    showContactIcons,
    entryLayout,
    theme,
  };
}

// GET /api/resume-settings — the signed-in user's saved customization, or null if none yet
router.get('/', async (req, res) => {
  const doc = await ResumeSettings.findOne({ user: req.user._id }).lean();
  res.json({ settings: toResponse(doc) });
});

// PUT /api/resume-settings — replace the signed-in user's customization
router.put('/', async (req, res) => {
  const { value, errors } = validateResumeSettings(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Invalid resume settings', errors });
  }

  const doc = await ResumeSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: value },
    { upsert: true, returnDocument: 'after', runValidators: true, lean: true },
  );
  res.json({ settings: toResponse(doc) });
});

export default router;
