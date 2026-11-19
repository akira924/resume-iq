import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { STATUS, STATUS_MESSAGES } from '../constants.js';
import { User } from '../models/User.js';
import {
  AUTH_COOKIE,
  authCookieOptions,
  requireAuth,
  signToken,
} from '../middleware/auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt only uses the first 72 bytes

// Used so login takes the same time whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

const str = (v) => (typeof v === 'string' ? v.trim() : '');

router.post('/register', async (req, res) => {
  const name = str(req.body?.name);
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const errors = {};
  if (!name) errors.name = 'Name is required';
  else if (name.length > 100) errors.name = 'Name is too long';
  if (!EMAIL_RE.test(email)) errors.email = 'A valid email is required';
  if (password.length < MIN_PASSWORD)
    errors.password = `Password must be at least ${MIN_PASSWORD} characters`;
  else if (Buffer.byteLength(password) > MAX_PASSWORD)
    errors.password = `Password must be at most ${MAX_PASSWORD} bytes`;
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  try {
    // role and status are never taken from the request; schema defaults apply (0 / 0).
    const user = await User.create({ name, email, password });
    return res.status(201).json({
      message: 'Registration successful. Your account is pending approval.',
      user: user.toPublic(),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ message: 'An account with this email already exists', errors: { email: 'Email already registered' } });
    }
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email }).select('+password');
  const valid = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_HASH);
  if (!user || !valid) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (user.status !== STATUS.ACTIVE) {
    return res.status(403).json({ message: STATUS_MESSAGES[user.status], status: user.status });
  }

  const token = signToken(user);
  const { exp } = jwt.decode(token);
  res.cookie(AUTH_COOKIE, token, {
    ...authCookieOptions,
    expires: new Date(exp * 1000),
  });
  return res.json({ user: user.toPublic() });
});

router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE, authCookieOptions);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

export default router;

