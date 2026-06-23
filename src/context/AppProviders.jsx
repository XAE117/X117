import { AppDataProvider } from './AppDataProvider'
import { AppUIProvider } from './AppUIProvider'

export default function AppProviders({ children }) {
  return (
    <AppDataProvider>
      <AppUIProvider>
        {children}
      </AppUIProvider>
    </AppDataProvider>
  )
}
