export const ROLE = Object.freeze({ USER: 0, ADMIN: 1 })

export const ROLE_LABELS = { 0: 'User', 1: 'Admin' }

export const PAGE_SIZES = [10, 20, 50]

// `value` matches the server's stored value.
export const SENIORITY_OPTIONS = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
]

export const STATUS = Object.freeze({
  REJECTED: -1,
  PENDING: 0,
  ACTIVE: 1,
  DEACTIVATED: 2,
})

export const STATUS_LABELS = {
  [STATUS.REJECTED]: 'Rejected',
  [STATUS.PENDING]: 'Pending',
  [STATUS.ACTIVE]: 'Active',
  [STATUS.DEACTIVATED]: 'Deactivated',
}

// Actions an admin can take for each status. `action` matches the server API.
export const STATUS_ACTIONS = {
  [STATUS.PENDING]: [
    { action: 'approve', label: 'Approve' },
    { action: 'reject', label: 'Reject', danger: true },
  ],
  [STATUS.ACTIVE]: [{ action: 'deactivate', label: 'Deactivate', danger: true }],
  [STATUS.DEACTIVATED]: [{ action: 'activate', label: 'Activate' }],
  [STATUS.REJECTED]: [],
}
