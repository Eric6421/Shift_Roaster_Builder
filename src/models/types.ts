/** 0 = Monday … 6 = Sunday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Employee {
  id: string
  name: string
  roles: string[]
}

export interface Shift {
  id: string
  employeeId: string
  dayOfWeek: DayOfWeek
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
