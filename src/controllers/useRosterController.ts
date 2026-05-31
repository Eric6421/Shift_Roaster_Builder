import { useCallback, useState } from 'react'
import type { Employee, Shift, ShiftConflict } from '@/models/types'

function createId(): string {
  return crypto.randomUUID()
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function shiftDurationHours(startTime: string, endTime: string): number {
  const minutes = timeToMinutes(endTime) - timeToMinutes(startTime)
  return minutes / 60
}

function shiftsOverlap(a: Shift, b: Shift): boolean {
  if (a.dayOfWeek !== b.dayOfWeek || a.employeeId !== b.employeeId) {
    return false
  }
  const aStart = timeToMinutes(a.startTime)
  const aEnd = timeToMinutes(a.endTime)
  const bStart = timeToMinutes(b.startTime)
  const bEnd = timeToMinutes(b.endTime)
  return aStart < bEnd && bStart < aEnd
}

function longestConsecutiveRun(days: number[]): number {
  if (days.length === 0) {
    return 0
  }

  const sorted = [...new Set(days)].sort((a, b) => a - b)
  let longest = 1
  let current = 1

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === sorted[i - 1] + 1) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }

  return longest
}

export function validateShift(shift: Shift, allShifts: Shift[]): ShiftConflict[] {
  const conflicts: ShiftConflict[] = []
  const employeeShifts = allShifts.filter((s) => s.employeeId === shift.employeeId)

  const overlapping = employeeShifts.filter(
    (s) => s.id !== shift.id && shiftsOverlap(shift, s),
  )
  if (overlapping.length > 0) {
    conflicts.push({
      type: 'overlap',
      message: 'Employee is assigned to overlapping shifts on the same day.',
      relatedShiftIds: overlapping.map((s) => s.id),
    })
  }

  const scheduledDays = [...new Set(employeeShifts.map((s) => s.dayOfWeek))]
  if (longestConsecutiveRun(scheduledDays) > 5) {
    conflicts.push({
      type: 'consecutive_days',
      message: 'Employee is scheduled for more than 5 consecutive days.',
      relatedShiftIds: employeeShifts.map((s) => s.id),
    })
  }

  return conflicts
}

export function calculateWeeklyHours(shifts: Shift[]): Record<string, number> {
  const hoursByEmployee: Record<string, number> = {}

  for (const shift of shifts) {
    const hours = shiftDurationHours(shift.startTime, shift.endTime)
    hoursByEmployee[shift.employeeId] =
      (hoursByEmployee[shift.employeeId] ?? 0) + hours
  }

  return hoursByEmployee
}

export function useRosterController() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])

  const addEmployee = useCallback((input: Omit<Employee, 'id'>) => {
    const employee: Employee = { ...input, id: createId() }
    setEmployees((prev) => [...prev, employee])
    return employee
  }, [])

  const editEmployee = useCallback(
    (id: string, updates: Partial<Omit<Employee, 'id'>>) => {
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === id ? { ...employee, ...updates } : employee,
        ),
      )
    },
    [],
  )

  const removeEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((employee) => employee.id !== id))
    setShifts((prev) => prev.filter((shift) => shift.employeeId !== id))
  }, [])

  const assignShift = useCallback((input: Omit<Shift, 'id'>) => {
    const shift: Shift = { ...input, id: createId() }
    setShifts((prev) => [...prev, shift])
    return shift
  }, [])

  const removeShift = useCallback((id: string) => {
    setShifts((prev) => prev.filter((shift) => shift.id !== id))
  }, [])

  const editShift = useCallback((id: string, updates: Partial<Omit<Shift, 'id'>>) => {
    let updated: Shift | undefined
    setShifts((prev) =>
      prev.map((shift) => {
        if (shift.id !== id) {
          return shift
        }
        updated = { ...shift, ...updates }
        return updated
      }),
    )
    return updated
  }, [])

  const validateShiftForRoster = useCallback(
    (shift: Shift) => validateShift(shift, shifts),
    [shifts],
  )

  const weeklyHours = useCallback(
    () => calculateWeeklyHours(shifts),
    [shifts],
  )

  return {
    employees,
    shifts,
    addEmployee,
    editEmployee,
    removeEmployee,
    assignShift,
    editShift,
    removeShift,
    validateShift: validateShiftForRoster,
    calculateWeeklyHours: weeklyHours,
  }
}
