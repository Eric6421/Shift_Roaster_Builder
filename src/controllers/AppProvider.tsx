import { createContext, useContext, type ReactNode } from 'react'

type AppContextValue = {
  appName: string
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AppContext.Provider value={{ appName: 'Shift Roaster Builder' }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return ctx
}
