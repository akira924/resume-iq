import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { STATUS, STATUS_MESSAGES } from '../constants.js';
import { User } from '../models/User.js';

export const AUTH_COOKIE = 'token';

export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  path: '/',
};

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// Requires a valid session cookie belonging to an active user.
// Status is re-checked on every request so deactivation takes effect immediately.
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    res.clearCookie(AUTH_COOKIE, authCookieOptions);
    return res.status(401).json({ message: 'Session expired' });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    res.clearCookie(AUTH_COOKIE, authCookieOptions);
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (user.status !== STATUS.ACTIVE) {
    res.clearCookie(AUTH_COOKIE, authCookieOptions);
    return res.status(403).json({ message: STATUS_MESSAGES[user.status] });
  }

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
