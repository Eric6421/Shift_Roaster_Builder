import { ConfigProvider, Tabs } from 'antd'
import { format } from 'date-fns'
import { useAppContext, useRosterController } from '@/controllers'
import { AppShell } from '@/views/components/AppShell'
import { EmployeeManager } from '@/views/EmployeeManager'
import { RosterGrid } from '@/views/RosterGrid'

function App() {
  const { appName } = useAppContext()
  const today = format(new Date(), 'EEEE, MMM d, yyyy')
  const roster = useRosterController()

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 8,
        },
      }}
    >
      <AppShell title={appName} subtitle={today}>
        <Tabs
          defaultActiveKey="roster"
          items={[
            {
              key: 'roster',
              label: 'Weekly roster',
              children: (
                <RosterGrid
                  employees={roster.employees}
                  shifts={roster.shifts}
                  assignShift={roster.assignShift}
                  editShift={roster.editShift}
                  removeShift={roster.removeShift}
                  validateShift={roster.validateShift}
                  calculateWeeklyHours={roster.calculateWeeklyHours}
                />
              ),
            },
            {
              key: 'employees',
              label: 'Employees',
              children: (
                <EmployeeManager
                  employees={roster.employees}
                  addEmployee={roster.addEmployee}
                  editEmployee={roster.editEmployee}
                  removeEmployee={roster.removeEmployee}
                />
              ),
            },
          ]}
        />
      </AppShell>
    </ConfigProvider>
  )
}

export default App
