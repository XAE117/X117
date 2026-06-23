import { useContext } from 'react'
import { AppUIContext } from './appUIContext'

export function useAppUIContext() {
  const context = useContext(AppUIContext)
  if (!context) {
    throw new Error('useAppUIContext must be used within AppUIProvider')
  }
  return context
}
