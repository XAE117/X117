import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Nav from './components/Nav.jsx'
import ModeSwitcher from './components/ModeSwitcher.jsx'
import Footer from './components/Footer.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import GodfatherAlert from './components/GodfatherAlert.jsx'
import FormatFilter from './components/FormatFilter.jsx'
import ByTheater from './views/ByTheater.jsx'
import ByDay from './views/ByDay.jsx'
import Tonight from './views/Tonight.jsx'
import Search from './views/Search.jsx'
import Detail from './views/Detail.jsx'
import Watchlist from './views/Watchlist.jsx'
import MapView from './views/MapView.jsx'
import DayScreenshot from './views/DayScreenshot.jsx'
import JazzTonight from './views/JazzTonight.jsx'
import JazzByVenue from './views/JazzByVenue.jsx'
import JazzByDay from './views/JazzByDay.jsx'
import JazzDetail from './views/JazzDetail.jsx'
import './App.css'

const FILM_FORMATS = ['35mm', '70mm', '16mm', 'nitrate']

function App() {
  const [data, setData] = useState(null)
  const [jazzData, setJazzData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [formatFilter, setFormatFilter] = useState('all')
  const location = useLocation()

  const isJazzMode = location.pathname.startsWith('/jazz')

  const fetchData = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    const base = import.meta.env.BASE_URL
    const t = Date.now()

    Promise.all([
      fetch(base + 'theaters.json?t=' + t).then(res => res.json()),
      fetch(base + 'jazz-venues.json?t=' + t).then(res => res.json()).catch(() => null),
    ])
      .then(([cinemaData, jazz]) => {
        setData(cinemaData)
        if (jazz) setJazzData(jazz)
        setLoading(false)
        setRefreshing(false)
      })
      .catch(err => {
        console.error('Failed to load data:', err)
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getFilteredData = () => {
    if (!data) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const theaters = data.theaters.map(theater => {
      let screenings = theater.screenings.filter(s => {
        const d = new Date(s.date + 'T00:00:00')
        return d >= today
      })

      // Apply format filter
      if (formatFilter !== 'all') {
        screenings = screenings.filter(s => {
          if (formatFilter === 'film') {
            return FILM_FORMATS.includes(s.format?.toLowerCase())
          }
          return s.format?.toLowerCase() === formatFilter.toLowerCase()
        })
      }

      return { ...theater, screenings }
    })

    return { ...data, theaters }
  }

  // Check if there are screenings today (for Nav indicator)
  const hasTonightScreenings = useMemo(() => {
    if (!data) return false
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return data.theaters.some(t => t.screenings.some(s => s.date === todayStr))
  }, [data])

  // Check if there are jazz shows today
  const hasTonightJazzShows = useMemo(() => {
    if (!jazzData) return false
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return jazzData.venues.some(v => v.shows.some(s => s.date === todayStr))
  }, [jazzData])

  // Show format filter on ByTheater and ByDay views (cinema only)
  const showFormatFilter = ['/', '/by-day'].includes(location.pathname)

  if (loading) return <LoadingSpinner />

  if (!data) {
    return (
      <div className="error-state">
        <h2>Unable to load data</h2>
        <p>Please try refreshing the page.</p>
      </div>
    )
  }

  const filteredData = getFilteredData()

  // Screenshot view renders standalone — no nav/header/footer chrome
  if (location.pathname.startsWith('/day/')) {
    return (
      <Routes>
        <Route path="/day/:date" element={<DayScreenshot data={data} />} />
      </Routes>
    )
  }

  const mode = isJazzMode ? 'jazz' : 'cinema'

  return (
    <div className={`app ${isJazzMode ? 'jazz-mode' : ''}`}>
      <Header mode={mode} />
      <ModeSwitcher />
      <Nav
        hasTonightScreenings={isJazzMode ? hasTonightJazzShows : hasTonightScreenings}
        mode={mode}
      />
      {!isJazzMode && <GodfatherAlert data={data} />}
      {showFormatFilter && (
        <div className="controls-row">
          <FormatFilter current={formatFilter} onChange={setFormatFilter} />
          <button
            className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh listings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      )}
      {!showFormatFilter && (
        <div className="controls">
          <button
            className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh listings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      )}
      <main className="main-content">
        <Routes>
          {/* Cinema routes */}
          <Route path="/" element={<ByTheater data={filteredData} />} />
          <Route path="/by-day" element={<ByDay data={filteredData} />} />
          <Route path="/tonight" element={<Tonight data={data} />} />
          <Route path="/search" element={<Search data={data} />} />
          <Route path="/screening/:screeningId" element={<Detail data={data} />} />
          <Route path="/watchlist" element={<Watchlist data={data} />} />
          <Route path="/map" element={<MapView data={filteredData} />} />

          {/* Jazz routes */}
          <Route path="/jazz" element={<JazzTonight data={jazzData} />} />
          <Route path="/jazz/by-venue" element={<JazzByVenue data={jazzData} />} />
          <Route path="/jazz/by-day" element={<JazzByDay data={jazzData} />} />
          <Route path="/jazz/show/:showId" element={<JazzDetail data={jazzData} />} />
        </Routes>
      </main>
      <Footer
        lastUpdated={isJazzMode && jazzData ? jazzData.lastUpdated : data.lastUpdated}
        theaters={isJazzMode && jazzData ? jazzData.venues : data.theaters}
      />
    </div>
  )
}

export default App
