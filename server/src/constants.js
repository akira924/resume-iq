export const ROLE = Object.freeze({
  USER: 0,
  ADMIN: 1,
});

export const STATUS = Object.freeze({
  REJECTED: -1,
  INACTIVE: 0, // registered, awaiting approval
  ACTIVE: 1, // approved
  DEACTIVATED: 2,
});

// Message returned when a non-active user tries to log in / use the API.
export const STATUS_MESSAGES = Object.freeze({
  [STATUS.REJECTED]: 'Your registration was rejected.',
  [STATUS.INACTIVE]: 'Your account is pending approval.',
  [STATUS.DEACTIVATED]: 'Your account has been deactivated.',
});
