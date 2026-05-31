/** 0 = Monday … 6 = Sunday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const ROLE_OPTIONS = ['Cashier', 'Supervisor', 'Cook'] as const

export type Role = (typeof ROLE_OPTIONS)[number]

export interface Employee {
  id: string
  name: string
  roles: string[]
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

export type ConflictType = 'overlap' | 'consecutive_days'

export interface ShiftConflict {
  type: ConflictType
  message: string
  relatedShiftIds: string[]
}
