import { Button, Card, ConfigProvider, Space } from 'antd'
import { format } from 'date-fns'
import { useAppContext } from '@/controllers'
import { AppShell } from '@/views/components/AppShell'

function App() {
  const { appName } = useAppContext()
  const today = format(new Date(), 'EEEE, MMM d, yyyy')

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
        <Card className="max-w-lg shadow-sm">
          <Space direction="vertical" size="middle">
            <p className="text-slate-600">
              Vite + React + TypeScript, Ant Design, Tailwind, lucide-react, and
              date-fns are wired up. MVC folders are under <code>src/</code>.
            </p>
            <Button type="primary">Ant Design button</Button>
          </Space>
        </Card>
      </AppShell>
    </ConfigProvider>
  )
}

export default App
