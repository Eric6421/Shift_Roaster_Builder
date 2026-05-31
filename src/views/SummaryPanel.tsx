import { Card, List } from 'antd'
import { Clock } from 'lucide-react'
import { useMemo } from 'react'
import type { useRosterController } from '@/controllers/useRosterController'
import type { Shift } from '@/models/types'

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

type SummaryPanelProps = Pick<
  ReturnType<typeof useRosterController>,
  'employees' | 'calculateWeeklyHours'
> & {
  shifts: Shift[]
}

export function SummaryPanel({ employees, shifts, calculateWeeklyHours }: SummaryPanelProps) {
  const weeklyHours = useMemo(
    () => calculateWeeklyHours(),
    [calculateWeeklyHours, shifts],
  )

  const totalHours = useMemo(
    () => Object.values(weeklyHours).reduce((sum, hours) => sum + hours, 0),
    [weeklyHours],
  )

  return (
    <Card
      className="w-full shrink-0 xl:w-64"
      title={
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Clock className="h-4 w-4 text-blue-600" aria-hidden />
          Weekly hours
        </span>
      }
      size="small"
    >
      {employees.length === 0 ? (
        <p className="text-sm text-slate-500">Hours summary appears once employees are added.</p>
      ) : (
        <>
          <List
            size="small"
            split={false}
            dataSource={employees}
            renderItem={(employee) => {
              const hours = weeklyHours[employee.id] ?? 0
              return (
                <List.Item className="!px-0 !py-1.5">
                  <div className="flex w-full items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate font-medium text-slate-800">{employee.name}</span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {formatHours(hours)}
                    </span>
                  </div>
                </List.Item>
              )
            }}
          />
          <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900">
            <span>Total</span>
            <span className="tabular-nums">{formatHours(totalHours)}</span>
          </div>
        </>
      )}
    </Card>
  )
}
