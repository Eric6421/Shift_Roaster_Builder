/** 0 = Monday … 6 = Sunday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const WEEK_DAY_OPTIONS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' },
]

export const ROLE_OPTIONS = ['Cashier', 'Supervisor', 'Cook'] as const

/** Earliest allowed shift time (24-hour), e.g. 9:00 AM */
export const SHIFT_EARLIEST_TIME = '09:00'

/** Latest allowed shift time (24-hour), e.g. 7:00 PM */
export const SHIFT_LATEST_TIME = '19:00'

export type Role = (typeof ROLE_OPTIONS)[number]

export interface Employee {
  id: string
  name: string
  roles: string[]
  /** Days this employee cannot work (0 = Monday … 6 = Sunday) */
  unavailableDays: DayOfWeek[]
}

export interface Shift {
  id: string
  employeeId: string
  dayOfWeek: DayOfWeek
  /** Optional label, e.g. "Morning shift" */
  name: string
  /** 24-hour time, e.g. "09:00" */
  startTime: string
  /** 24-hour time, e.g. "17:00" */
  endTime: string
}

export type ConflictType = 'overlap' | 'consecutive_days' | 'unavailable'

export interface ShiftConflict {
  type: ConflictType
  message: string
  relatedShiftIds: string[]
}
