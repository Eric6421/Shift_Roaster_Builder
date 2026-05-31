import { Layout, Typography } from 'antd'
import { CalendarDays } from 'lucide-react'
import type { ReactNode } from 'react'

const { Content, Header } = Layout
const { Title, Text } = Typography

type AppShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <Layout className="min-h-screen bg-slate-50">
      <Header className="flex items-center gap-3 bg-white px-6 shadow-sm">
        <CalendarDays className="h-6 w-6 text-blue-600" aria-hidden />
        <div>
          <Title level={4} className="!mb-0">
            {title}
          </Title>
          {subtitle ? (
            <Text type="secondary" className="text-sm">
              {subtitle}
            </Text>
          ) : null}
        </div>
      </Header>
      <Content className="p-6">{children}</Content>
    </Layout>
  )
}
