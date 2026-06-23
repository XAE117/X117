import { useContext } from 'react'
import { AppDataContext } from './appDataContext'

export function useAppDataContext() {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error('useAppDataContext must be used within AppDataProvider')
  }
  return context
}
