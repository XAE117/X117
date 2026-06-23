import { useAppData } from '../hooks/useAppData'
import { AppDataContext } from './appDataContext'

export function AppDataProvider({ children }) {
  const value = useAppData()

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  )
}
