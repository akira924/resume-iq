import { Router } from 'express';
import mongoose from 'mongoose';
import { ROLE, STATUS } from '../constants.js';
import { User } from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole(ROLE.ADMIN));

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Allowed status changes: action -> { from: current status, to: new status }.
export const STATUS_ACTIONS = Object.freeze({
  approve: { from: STATUS.INACTIVE, to: STATUS.ACTIVE },
  reject: { from: STATUS.INACTIVE, to: STATUS.REJECTED },
  deactivate: { from: STATUS.ACTIVE, to: STATUS.DEACTIVATED },
  activate: { from: STATUS.DEACTIVATED, to: STATUS.ACTIVE },
});

const toPositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

// GET /api/users?page=1&limit=10  (newest first)
router.get('/', async (req, res) => {
  const limit = Math.min(toPositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const total = await User.countDocuments();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(toPositiveInt(req.query.page, 1), totalPages);

  const users = await User.find()
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    users: users.map((u) => ({ ...u.toPublic(), createdAt: u.createdAt })),
    page,
    limit,
    total,
    totalPages,
  });
});

// PATCH /api/users/:id/status  { action: 'approve' | 'reject' | 'deactivate' | 'activate' }
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const action = STATUS_ACTIONS[req.body?.action];
  if (!action) {
    return res.status(400).json({ message: 'Invalid action' });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (id === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot change your own status' });
  }

  // Conditional update so two admins acting at once can't apply an invalid transition.
  const user = await User.findOneAndUpdate(
    { _id: id, status: action.from },
    { $set: { status: action.to } },
    { returnDocument: 'after' },
  );
  if (!user) {
    const exists = await User.exists({ _id: id });
    return exists
      ? res.status(409).json({ message: 'This action is not allowed for the user’s current status' })
      : res.status(404).json({ message: 'User not found' });
  }

  res.json({ user: { ...user.toPublic(), createdAt: user.createdAt } });
});

export default router;
