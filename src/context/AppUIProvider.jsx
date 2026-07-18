import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useCinemaFilter } from '../hooks/useCinemaFilter'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  getMode,
  isFoodMode as checkFood,
  isGuideMode as checkGuide,
  isJazzMode as checkJazz,
  isRollMode as checkRoll,
  isScreenshotRoute as checkScreenshot,
} from '../utils/modeDetection'
import { AppUIContext } from './appUIContext'
import { useAppDataContext } from './useAppDataContext'

export function AppUIProvider({ children }) {
  const location = useLocation()
  const { data } = useAppDataContext()
  const [formatFilter, setFormatFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [vibe, setVibe] = useState('all')
  const mode = getMode(location.pathname)
  const isJazz = checkJazz(location.pathname)
  const isFood = checkFood(location.pathname)
  const isGuide = checkGuide(location.pathname)
  const isRoll = checkRoll(location.pathname)
  const isScreenshotRoute = checkScreenshot(location.pathname)
  const showBackPill = location.pathname.startsWith('/screening/') || location.pathname.startsWith('/jazz/show/') || location.pathname.startsWith('/food/spot/')
  const filteredData = useCinemaFilter(data, formatFilter)

  usePageTitle(mode, location.pathname)

  const value = useMemo(() => ({
    location,
    mode,
    isJazz,
    isFood,
    isGuide,
    isRoll,
    isScreenshotRoute,
    showBackPill,
    filteredData,
    formatFilter,
    setFormatFilter,
    searchQuery,
    setSearchQuery,
    vibe,
    setVibe,
  }), [
    location,
    mode,
    isJazz,
    isFood,
    isGuide,
    isRoll,
    isScreenshotRoute,
    showBackPill,
    filteredData,
    formatFilter,
    searchQuery,
    vibe,
  ])

  return (
    <AppUIContext.Provider value={value}>
      {children}
    </AppUIContext.Provider>
  )
}
