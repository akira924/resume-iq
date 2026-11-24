import { Router } from 'express';
import { PromptSettings } from '../models/PromptSettings.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const QA_PROMPT_MAX_LENGTH = 10000;

// Used until the user edits the Q/A prompt, and again after they reset it.
export const DEFAULT_QA_PROMPT = `I am filling in the online application form for the job below.

For each question, write an answer that is (1) true to my background, (2) under the character limit I give, and (3) uses the ad's keywords where they fit naturally, within only one paragraph based on the job description and my resume generated.

For yes/no knock-out questions, only answer "Yes" or "No".

For asking only number of years of experience, only answer enough number.

Write answers as a human candidate, so those answers are not flagged as an AI generated sentence.

Use ", ', - instead of smart characters.`;

function toResponse(doc) {
  const custom = doc?.qaPrompt;
  return {
    qaPrompt: custom || DEFAULT_QA_PROMPT,
    qaPromptIsDefault: !custom,
    defaultQaPrompt: DEFAULT_QA_PROMPT,
  };
}

// GET /api/prompts — the signed-in user's Q/A prompt (their edit, or the default)
router.get('/', async (req, res) => {
  const doc = await PromptSettings.findOne({ user: req.user._id }).lean();
  res.json(toResponse(doc));
});

// PUT /api/prompts — { qaPrompt }. null, blank, or the default text resets to the default.
router.put('/', async (req, res) => {
  const raw = req.body?.qaPrompt;
  if (raw !== null && typeof raw !== 'string') {
    return res.status(400).json({ message: 'Invalid prompt', errors: { qaPrompt: 'Must be text' } });
  }
  if (typeof raw === 'string' && raw.length > QA_PROMPT_MAX_LENGTH) {
    return res.status(400).json({
      message: 'Invalid prompt',
      errors: { qaPrompt: `Must be at most ${QA_PROMPT_MAX_LENGTH} characters` },
    });
  }
  const qaPrompt = !raw?.trim() || raw === DEFAULT_QA_PROMPT ? null : raw;

  const doc = await PromptSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { qaPrompt } },
    { upsert: true, returnDocument: 'after', runValidators: true, lean: true },
  );
  res.json(toResponse(doc));
});

export default router;
