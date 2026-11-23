import { APP_URL } from './config.js'

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

// Mirrors client/src/api/client.js. Because the extension has host permission
// for APP_URL, Chrome attaches the app's cookies (credentials: 'include'),
// treats the request as same-site and skips CORS.
export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${APP_URL}/api${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(`Cannot reach ResumeIQ at ${APP_URL}`, 0, null)
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(data?.message || 'Request failed', res.status, data)
  }
  return data
}
