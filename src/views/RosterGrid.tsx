import { Alert, Form, Input, Modal, Popconfirm, Space, Tag, Tooltip, message } from 'antd'
import { AlertTriangle, Clock, Plus, Trash2, User } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import type { useRosterController } from '@/controllers/useRosterController'
import type { DayOfWeek, Employee, Shift, ShiftConflict } from '@/models/types'

const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' },
]

type ShiftFormValues = {
  startTime: string
  endTime: string
}

type RosterGridActions = Pick<
  ReturnType<typeof useRosterController>,
  'employees' | 'shifts' | 'assignShift' | 'removeShift' | 'validateShift' | 'calculateWeeklyHours'
>

type RosterGridProps = RosterGridActions

type CellTarget = {
  employeeId: string
  dayOfWeek: DayOfWeek
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

function hasConflicts(conflicts: ShiftConflict[] | undefined): boolean {
  return (conflicts?.length ?? 0) > 0
}

function employeeHasConsecutiveConflict(
  employeeId: string,
  shifts: Shift[],
  validateShift: (shift: Shift) => ShiftConflict[],
): boolean {
  const employeeShifts = shifts.filter((s) => s.employeeId === employeeId)
  if (employeeShifts.length === 0) {
    return false
  }
  return employeeShifts.some((shift) =>
    validateShift(shift).some((c) => c.type === 'consecutive_days'),
  )
}

export function RosterGrid({
  employees,
  shifts,
  assignShift,
  removeShift,
  validateShift,
  calculateWeeklyHours,
}: RosterGridProps) {
  const [form] = Form.useForm<ShiftFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [cellTarget, setCellTarget] = useState<CellTarget | null>(null)

  const weeklyHours = useMemo(() => calculateWeeklyHours(), [calculateWeeklyHours, shifts])

  const conflictsByShiftId = useMemo(() => {
    const map = new Map<string, ShiftConflict[]>()
    for (const shift of shifts) {
      const conflicts = validateShift(shift)
      if (conflicts.length > 0) {
        map.set(shift.id, conflicts)
      }
    }
    return map
  }, [shifts, validateShift])

  const shiftsByEmployeeDay = useMemo(() => {
    const map = new Map<string, Shift[]>()
    for (const shift of shifts) {
      const key = `${shift.employeeId}-${shift.dayOfWeek}`
      const existing = map.get(key) ?? []
      existing.push(shift)
      map.set(key, existing)
    }
    for (const [, cellShifts] of map) {
      cellShifts.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    return map
  }, [shifts])

  const conflictCount = conflictsByShiftId.size

  const openAssignModal = useCallback(
    (employeeId: string, dayOfWeek: DayOfWeek) => {
      setCellTarget({ employeeId, dayOfWeek })
      form.setFieldsValue({ startTime: '09:00', endTime: '17:00' })
      setModalOpen(true)
    },
    [form],
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setCellTarget(null)
    form.resetFields()
  }, [form])

  const handleAssignShift = useCallback(async () => {
    if (!cellTarget) {
      return
    }

    try {
      const values = await form.validateFields()
      const { startTime, endTime } = values

      if (startTime >= endTime) {
        message.error('End time must be after start time.')
        return
      }

      const shift = assignShift({
        employeeId: cellTarget.employeeId,
        dayOfWeek: cellTarget.dayOfWeek,
        startTime,
        endTime,
      })

      const conflicts = validateShift(shift)
      if (conflicts.length > 0) {
        message.warning(conflicts.map((c) => c.message).join(' '))
      } else {
        message.success('Shift assigned.')
      }

      closeModal()
    } catch {
      message.error('Please fix the highlighted fields before saving.')
    }
  }, [assignShift, cellTarget, closeModal, form, validateShift])

  const handleRemoveShift = useCallback(
    (shift: Shift) => {
      removeShift(shift.id)
      message.success('Shift removed.')
    },
    [removeShift],
  )

  const targetEmployee = cellTarget
    ? employees.find((e) => e.id === cellTarget.employeeId)
    : undefined
  const targetDay = cellTarget ? DAYS.find((d) => d.value === cellTarget.dayOfWeek) : undefined

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Weekly roster</h2>
          <p className="text-sm text-slate-600">
            Assign shifts across the week. Overlapping shifts and more than 5 consecutive days are
            flagged.
          </p>
        </div>
        {conflictCount > 0 ? (
          <Alert
            type="warning"
            showIcon
            icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
            message={`${conflictCount} shift${conflictCount === 1 ? '' : 's'} with scheduling conflicts`}
            className="max-w-sm shrink-0"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <User className="h-10 w-10 text-slate-300" aria-hidden />
              <p className="font-medium text-slate-700">No employees to schedule</p>
              <p className="text-sm text-slate-500">Add team members first, then assign shifts here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid min-w-[880px]"
                style={{ gridTemplateColumns: 'minmax(180px, 220px) repeat(7, minmax(100px, 1fr))' }}
              >
                <div className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Employee
                </div>
                {DAYS.map((day) => (
                  <div
                    key={day.value}
                    className="border-b border-r border-slate-200 bg-slate-100 px-2 py-3 text-center last:border-r-0"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {day.short}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{day.label}</div>
                  </div>
                ))}

                {employees.map((employee) => {
                  const hasConsecutiveConflict = employeeHasConsecutiveConflict(
                    employee.id,
                    shifts,
                    validateShift,
                  )

                  return (
                    <EmployeeRow
                      key={employee.id}
                      employee={employee}
                      hasConsecutiveConflict={hasConsecutiveConflict}
                      shiftsByEmployeeDay={shiftsByEmployeeDay}
                      conflictsByShiftId={conflictsByShiftId}
                      onAssign={openAssignModal}
                      onRemove={handleRemoveShift}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="w-full shrink-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:w-64">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-900">Weekly hours</h3>
          </div>
          {employees.length === 0 ? (
            <p className="text-sm text-slate-500">Hours summary appears once employees are added.</p>
          ) : (
            <ul className="space-y-2">
              {employees.map((employee) => {
                const hours = weeklyHours[employee.id] ?? 0
                return (
                  <li
                    key={employee.id}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium text-slate-800">{employee.name}</span>
                    <span className="ml-2 shrink-0 tabular-nums text-slate-600">
                      {formatHours(hours)}
                    </span>
                  </li>
                )
              })}
              <li className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatHours(Object.values(weeklyHours).reduce((sum, h) => sum + h, 0))}
                </span>
              </li>
            </ul>
          )}
        </aside>
      </div>

      <Modal
        title="Assign shift"
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleAssignShift}
        okText="Assign shift"
        destroyOnHidden
      >
        {targetEmployee && targetDay ? (
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{targetEmployee.name}</p>
            <p className="mt-0.5 text-sm text-slate-600">{targetDay.label}</p>
            {targetEmployee.roles.length > 0 ? (
              <Space size={[4, 4]} wrap className="mt-2">
                {targetEmployee.roles.map((role) => (
                  <Tag key={role} className="!m-0 !text-[10px]">
                    {role}
                  </Tag>
                ))}
              </Space>
            ) : null}
          </div>
        ) : null}
        <Form<ShiftFormValues> form={form} layout="vertical">
          <Form.Item
            label="Start time"
            name="startTime"
            rules={[{ required: true, message: 'Start time is required.' }]}
          >
            <Input type="time" />
          </Form.Item>
          <Form.Item
            label="End time"
            name="endTime"
            rules={[{ required: true, message: 'End time is required.' }]}
          >
            <Input type="time" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

type EmployeeRowProps = {
  employee: Employee
  hasConsecutiveConflict: boolean
  shiftsByEmployeeDay: Map<string, Shift[]>
  conflictsByShiftId: Map<string, ShiftConflict[]>
  onAssign: (employeeId: string, dayOfWeek: DayOfWeek) => void
  onRemove: (shift: Shift) => void
}

function EmployeeRow({
  employee,
  hasConsecutiveConflict,
  shiftsByEmployeeDay,
  conflictsByShiftId,
  onAssign,
  onRemove,
}: EmployeeRowProps) {
  return (
    <>
      <div className="sticky left-0 z-10 flex flex-col justify-center gap-1 border-b border-r border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-slate-800">{employee.name}</span>
          {hasConsecutiveConflict ? (
            <Tooltip title="This employee is scheduled for more than 5 consecutive days this week">
              <AlertTriangle
                className="h-3.5 w-3.5 shrink-0 text-amber-500"
                aria-label="Consecutive days conflict"
              />
            </Tooltip>
          ) : null}
        </div>
        <Space size={[4, 4]} wrap className="max-w-full">
          {employee.roles.map((role) => (
            <Tag key={role} className="!m-0 !text-[10px]">
              {role}
            </Tag>
          ))}
        </Space>
      </div>

      {DAYS.map((day) => {
        const cellShifts = shiftsByEmployeeDay.get(`${employee.id}-${day.value}`) ?? []
        const isEmpty = cellShifts.length === 0

        return (
          <div
            key={day.value}
            className={[
              'group relative min-h-[88px] border-b border-r border-slate-200 p-1.5 last:border-r-0',
              isEmpty ? 'bg-slate-50/40' : 'bg-white hover:bg-slate-50/80',
            ].join(' ')}
          >
            {isEmpty ? (
              <button
                type="button"
                onClick={() => onAssign(employee.id, day.value)}
                className="flex h-full min-h-[76px] w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-white text-slate-400 transition-colors hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
                aria-label={`Assign shift for ${employee.name} on ${day.label}`}
              >
                <Plus className="h-4 w-4" aria-hidden />
                <span className="text-xs font-medium">Assign shift</span>
              </button>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  {cellShifts.map((shift) => (
                    <ShiftBlock
                      key={shift.id}
                      shift={shift}
                      conflicts={conflictsByShiftId.get(shift.id)}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onAssign(employee.id, day.value)}
                  className="mt-1 flex w-full items-center justify-center gap-1 rounded border border-dashed border-slate-200 py-1 text-[11px] text-slate-400 opacity-0 transition-opacity hover:border-blue-300 hover:text-blue-600 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Add another shift for ${employee.name} on ${day.label}`}
                >
                  <Plus className="h-3 w-3" aria-hidden />
                  Add shift
                </button>
              </>
            )}
          </div>
        )
      })}
    </>
  )
}

type ShiftBlockProps = {
  shift: Shift
  conflicts: ShiftConflict[] | undefined
  onRemove: (shift: Shift) => void
}

function ShiftBlock({ shift, conflicts, onRemove }: ShiftBlockProps) {
  const conflicted = hasConflicts(conflicts)
  const conflictMessages = conflicts?.map((c) => c.message).join(' ') ?? ''

  return (
    <Tooltip title={conflicted ? conflictMessages : undefined}>
      <div
        className={[
          'group/shift relative rounded px-2 py-1.5 text-xs leading-tight',
          conflicted
            ? 'border-2 border-red-400 bg-red-50 text-red-900 shadow-sm'
            : 'border border-blue-200 bg-blue-50 text-blue-900',
        ].join(' ')}
      >
        <div className="flex items-center gap-1 pr-5 font-medium tabular-nums">
          {conflicted ? (
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0 text-red-500"
              aria-label="Scheduling conflict"
            />
          ) : null}
          <span>
            {shift.startTime} – {shift.endTime}
          </span>
        </div>
        <Popconfirm
          title="Remove this shift?"
          okText="Remove"
          okButtonProps={{ danger: true }}
          onConfirm={() => onRemove(shift)}
        >
          <button
            type="button"
            className="absolute right-1 top-1 rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-white/60 hover:text-red-600 group-hover/shift:opacity-100 focus:opacity-100"
            aria-label={`Remove shift ${shift.startTime} to ${shift.endTime}`}
          >
            <Trash2 className="h-3 w-3" aria-hidden />
          </button>
        </Popconfirm>
      </div>
    </Tooltip>
  )
}
