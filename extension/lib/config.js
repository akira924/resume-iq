// Origin of the ResumeIQ web app. The extension calls `${APP_URL}/api/...`, the
// same origin the web client uses, so the browser sends the same httpOnly
// session cookie and both share one login.
// When you change this, also update `host_permissions` in manifest.json.
export const APP_URL = 'https://resume-iq-gamma-five.vercel.app'

// Must match AUTH_COOKIE in server/src/middleware/auth.js.
export const AUTH_COOKIE = 'token'
