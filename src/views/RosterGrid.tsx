import { Alert, Form, Input, Modal, Popconfirm, Space, Tag, Tooltip, message } from 'antd'
import { AlertTriangle, Clock, Plus, Trash2, User } from 'lucide-react'
import { SummaryPanel } from '@/views/SummaryPanel'
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

const SHIFT_DRAG_TYPE = 'application/x-shift-id'

type ShiftFormValues = {
  name: string
  startTime: string
  endTime: string
}

type RosterGridActions = Pick<
  ReturnType<typeof useRosterController>,
  | 'employees'
  | 'shifts'
  | 'assignShift'
  | 'editShift'
  | 'removeShift'
  | 'validateShift'
  | 'calculateWeeklyHours'
>

type RosterGridProps = RosterGridActions

type CellTarget = {
  employeeId: string
  dayOfWeek: DayOfWeek
}

type ModalContext =
  | { mode: 'assign'; employeeId: string; dayOfWeek: DayOfWeek }
  | { mode: 'edit'; shift: Shift }

type DropTarget = CellTarget

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

function notifyConflicts(
  shift: Shift | undefined,
  validateShift: (shift: Shift) => ShiftConflict[],
  successMessage: string,
) {
  if (!shift) {
    return
  }
  const conflicts = validateShift(shift)
  if (conflicts.length > 0) {
    message.warning(conflicts.map((c) => c.message).join(' '))
  } else {
    message.success(successMessage)
  }
}

export function RosterGrid({
  employees,
  shifts,
  assignShift,
  editShift,
  removeShift,
  validateShift,
  calculateWeeklyHours,
}: RosterGridProps) {
  const [form] = Form.useForm<ShiftFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContext, setModalContext] = useState<ModalContext | null>(null)
  const [draggingShiftId, setDraggingShiftId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

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
      setModalContext({ mode: 'assign', employeeId, dayOfWeek })
      form.setFieldsValue({ name: '', startTime: '09:00', endTime: '17:00' })
      setModalOpen(true)
    },
    [form],
  )

  const openEditModal = useCallback(
    (shift: Shift) => {
      setModalContext({ mode: 'edit', shift })
      form.setFieldsValue({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
      })
      setModalOpen(true)
    },
    [form],
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setModalContext(null)
    form.resetFields()
  }, [form])

  const handleSaveShift = useCallback(async () => {
    if (!modalContext) {
      return
    }

    try {
      const values = await form.validateFields()
      const name = values.name.trim()
      const { startTime, endTime } = values

      if (startTime >= endTime) {
        message.error('End time must be after start time.')
        return
      }

      if (modalContext.mode === 'assign') {
        const shift = assignShift({
          employeeId: modalContext.employeeId,
          dayOfWeek: modalContext.dayOfWeek,
          name,
          startTime,
          endTime,
        })
        notifyConflicts(shift, validateShift, 'Shift assigned.')
      } else {
        const shift = editShift(modalContext.shift.id, { name, startTime, endTime })
        notifyConflicts(shift, validateShift, 'Shift updated.')
      }

      closeModal()
    } catch {
      message.error('Please fix the highlighted fields before saving.')
    }
  }, [assignShift, closeModal, editShift, form, modalContext, validateShift])

  const handleRemoveShift = useCallback(
    (shift: Shift) => {
      removeShift(shift.id)
      message.success('Shift removed.')
    },
    [removeShift],
  )

  const handleDragStart = useCallback((shiftId: string) => {
    setDraggingShiftId(shiftId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingShiftId(null)
    setDropTarget(null)
  }, [])

  const handleDragOverCell = useCallback((target: DropTarget | null) => {
    setDropTarget(target)
  }, [])

  const handleDropShift = useCallback(
    (shiftId: string, target: DropTarget) => {
      const shift = shifts.find((s) => s.id === shiftId)
      if (!shift) {
        return
      }

      if (shift.employeeId === target.employeeId && shift.dayOfWeek === target.dayOfWeek) {
        return
      }

      const updated = editShift(shiftId, {
        employeeId: target.employeeId,
        dayOfWeek: target.dayOfWeek,
      })
      notifyConflicts(updated, validateShift, 'Shift moved.')
    },
    [editShift, shifts, validateShift],
  )

  const modalEmployee =
    modalContext?.mode === 'assign'
      ? employees.find((e) => e.id === modalContext.employeeId)
      : modalContext?.mode === 'edit'
        ? employees.find((e) => e.id === modalContext.shift.employeeId)
        : undefined

  const modalDay =
    modalContext?.mode === 'assign'
      ? DAYS.find((d) => d.value === modalContext.dayOfWeek)
      : modalContext?.mode === 'edit'
        ? DAYS.find((d) => d.value === modalContext.shift.dayOfWeek)
        : undefined

  const modalTitle = modalContext?.mode === 'edit' ? 'Edit shift' : 'Assign shift'
  const modalOkText = modalContext?.mode === 'edit' ? 'Save changes' : 'Assign shift'

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Weekly roster</h2>
          <p className="text-sm text-slate-600">
            Assign shifts across the week. Drag a shift to another day or employee. Overlapping
            shifts and more than 5 consecutive days are flagged.
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
                      draggingShiftId={draggingShiftId}
                      dropTarget={dropTarget}
                      onAssign={openAssignModal}
                      onEdit={openEditModal}
                      onRemove={handleRemoveShift}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOverCell={handleDragOverCell}
                      onDropShift={handleDropShift}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <SummaryPanel
          employees={employees}
          shifts={shifts}
          calculateWeeklyHours={calculateWeeklyHours}
        />
      </div>

      <Modal
        title={modalTitle}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSaveShift}
        okText={modalOkText}
        destroyOnHidden
      >
        {modalEmployee && modalDay ? (
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-500">Employee:</span>{' '}
              <span className="font-semibold text-slate-900">{modalEmployee.name}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-500">Day:</span> {modalDay.label}
            </p>
            {modalEmployee.roles.length > 0 ? (
              <Space size={[4, 4]} wrap className="mt-2">
                {modalEmployee.roles.map((role) => (
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
            label="Shift name"
            name="name"
            rules={[{ required: true, message: 'Shift name is required.' }]}
          >
            <Input placeholder="e.g. Morning shift" maxLength={60} autoFocus />
          </Form.Item>
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
  draggingShiftId: string | null
  dropTarget: DropTarget | null
  onAssign: (employeeId: string, dayOfWeek: DayOfWeek) => void
  onEdit: (shift: Shift) => void
  onRemove: (shift: Shift) => void
  onDragStart: (shiftId: string) => void
  onDragEnd: () => void
  onDragOverCell: (target: DropTarget | null) => void
  onDropShift: (shiftId: string, target: DropTarget) => void
}

function EmployeeRow({
  employee,
  hasConsecutiveConflict,
  shiftsByEmployeeDay,
  conflictsByShiftId,
  draggingShiftId,
  dropTarget,
  onAssign,
  onEdit,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOverCell,
  onDropShift,
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
        const cellTarget: DropTarget = { employeeId: employee.id, dayOfWeek: day.value }
        const cellShifts = shiftsByEmployeeDay.get(`${employee.id}-${day.value}`) ?? []
        const isEmpty = cellShifts.length === 0
        const isDropTarget =
          draggingShiftId !== null &&
          dropTarget?.employeeId === cellTarget.employeeId &&
          dropTarget?.dayOfWeek === cellTarget.dayOfWeek

        return (
          <div
            key={day.value}
            className={[
              'group relative min-h-[88px] border-b border-r border-slate-200 p-1.5 last:border-r-0',
              isDropTarget
                ? 'bg-blue-50 ring-2 ring-inset ring-blue-400'
                : isEmpty
                  ? 'bg-slate-50/40'
                  : 'bg-white hover:bg-slate-50/80',
            ].join(' ')}
            onDragOver={(event) => {
              if (!event.dataTransfer.types.includes(SHIFT_DRAG_TYPE)) {
                return
              }
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              onDragOverCell(cellTarget)
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) {
                return
              }
              if (
                dropTarget?.employeeId === cellTarget.employeeId &&
                dropTarget?.dayOfWeek === cellTarget.dayOfWeek
              ) {
                onDragOverCell(null)
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              const shiftId = event.dataTransfer.getData(SHIFT_DRAG_TYPE)
              if (shiftId) {
                onDropShift(shiftId, cellTarget)
              }
              onDragEnd()
            }}
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
                      isDragging={draggingShiftId === shift.id}
                      onEdit={onEdit}
                      onRemove={onRemove}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
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
  isDragging: boolean
  onEdit: (shift: Shift) => void
  onRemove: (shift: Shift) => void
  onDragStart: (shiftId: string) => void
  onDragEnd: () => void
}

function ShiftBlock({
  shift,
  conflicts,
  isDragging,
  onEdit,
  onRemove,
  onDragStart,
  onDragEnd,
}: ShiftBlockProps) {
  const conflicted = hasConflicts(conflicts)
  const conflictMessages = conflicts?.map((c) => c.message).join(' ') ?? ''

  return (
    <Tooltip title={conflicted ? conflictMessages : 'Drag to another day or employee'}>
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(SHIFT_DRAG_TYPE, shift.id)
          event.dataTransfer.effectAllowed = 'move'
          onDragStart(shift.id)
        }}
        onDragEnd={onDragEnd}
        className={[
          'group/shift relative cursor-grab rounded px-2 py-1.5 text-xs leading-tight active:cursor-grabbing',
          isDragging ? 'opacity-40' : '',
          conflicted
            ? 'border-2 border-red-400 bg-red-50 text-red-900 shadow-sm'
            : 'border border-blue-200 bg-blue-50 text-blue-900',
        ].join(' ')}
      >
        <div className="flex flex-col gap-0.5 pr-10">
          {shift.name ? (
            <span className="truncate font-semibold leading-tight">{shift.name}</span>
          ) : null}
          <div className="flex items-center gap-1 font-medium tabular-nums">
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
        </div>
        <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover/shift:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(shift)}
            className="rounded p-0.5 text-slate-400 hover:bg-white/60 hover:text-blue-600 focus:opacity-100"
            aria-label={`Edit shift ${shift.name || `${shift.startTime} to ${shift.endTime}`}`}
          >
            <Clock className="h-3 w-3" aria-hidden />
          </button>
          <Popconfirm
            title="Remove this shift?"
            okText="Remove"
            okButtonProps={{ danger: true }}
            onConfirm={() => onRemove(shift)}
          >
            <button
              type="button"
              className="rounded p-0.5 text-slate-400 hover:bg-white/60 hover:text-red-600 focus:opacity-100"
              aria-label={`Remove shift ${shift.name || `${shift.startTime} to ${shift.endTime}`}`}
            >
              <Trash2 className="h-3 w-3" aria-hidden />
            </button>
          </Popconfirm>
        </div>
      </div>
    </Tooltip>
  )
}
