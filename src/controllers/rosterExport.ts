import { format } from 'date-fns'
import type { Employee, Shift, ShiftConflict } from '@/models/types'
import { WEEK_DAY_OPTIONS } from '@/models/types'
import { calculateWeeklyHours } from './useRosterController'

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function shiftDurationHours(startTime: string, endTime: string): number {
  const minutes = timeToMinutes(endTime) - timeToMinutes(startTime)
  return minutes / 60
}

function formatHoursValue(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function dayLabel(dayOfWeek: number): string {
  return WEEK_DAY_OPTIONS.find((d) => d.value === dayOfWeek)?.label ?? ''
}

export type RosterCsvOptions = {
  validateShift?: (shift: Shift) => ShiftConflict[]
  generatedAt?: Date
}

export function buildRosterCsv(
  employees: Employee[],
  shifts: Shift[],
  options: RosterCsvOptions = {},
): string {
  const generatedAt = options.generatedAt ?? new Date()
  const hoursByEmployee = calculateWeeklyHours(shifts)
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]))
  const lines: string[] = []

  lines.push('Weekly Shift Roster')
  lines.push(`Generated,${escapeCsvField(format(generatedAt, 'yyyy-MM-dd HH:mm'))}`)
  lines.push('')

  const headers = [
    'Employee',
    'Roles',
    'Day',
    'Shift Name',
    'Start Time',
    'End Time',
    'Hours',
    'Notes',
  ]
  lines.push(headers.map(escapeCsvField).join(','))

  const sortedShifts = [...shifts].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek
    }
    const nameA = employeeById.get(a.employeeId)?.name ?? ''
    const nameB = employeeById.get(b.employeeId)?.name ?? ''
    const byName = nameA.localeCompare(nameB)
    if (byName !== 0) {
      return byName
    }
    return a.startTime.localeCompare(b.startTime)
  })

  for (const shift of sortedShifts) {
    const employee = employeeById.get(shift.employeeId)
    const conflicts = options.validateShift?.(shift) ?? []
    const notes = conflicts.map((conflict) => conflict.message).join('; ')
    const row = [
      employee?.name ?? 'Unknown',
      employee?.roles.join('; ') ?? '',
      dayLabel(shift.dayOfWeek),
      shift.name,
      shift.startTime,
      shift.endTime,
      formatHoursValue(shiftDurationHours(shift.startTime, shift.endTime)),
      notes,
    ]
    lines.push(row.map((value) => escapeCsvField(String(value))).join(','))
  }

  lines.push('')
  lines.push('Weekly Hours Summary')
  lines.push(['Employee', 'Total Hours'].map(escapeCsvField).join(','))

  for (const employee of employees) {
    const hours = hoursByEmployee[employee.id] ?? 0
    lines.push(
      [employee.name, formatHoursValue(hours)]
        .map((value) => escapeCsvField(String(value)))
        .join(','),
    )
  }

  const totalHours = Object.values(hoursByEmployee).reduce((sum, hours) => sum + hours, 0)
  lines.push(
    ['Total', formatHoursValue(totalHours)]
      .map((value) => escapeCsvField(String(value)))
      .join(','),
  )

  return lines.join('\r\n')
}

export function downloadRosterCsv(
  employees: Employee[],
  shifts: Shift[],
  options: RosterCsvOptions = {},
): void {
  const csv = buildRosterCsv(employees, shifts, options)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `weekly-roster-${format(options.generatedAt ?? new Date(), 'yyyy-MM-dd')}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
