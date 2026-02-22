import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import SearchBar from './components/SearchBar.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import ByTheater from './views/ByTheater.jsx'
import ByMonth from './views/ByMonth.jsx'
import Detail from './views/Detail.jsx'
import './App.css'

const FAVORITES_KEY = 'palace-favorites'

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFavorites(ids) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids))
}

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [thisWeekOnly, setThisWeekOnly] = useState(false)
  const [tonightOnly, setTonightOnly] = useState(false)
  const [formatFilter, setFormatFilter] = useState(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState(loadFavorites)

  useEffect(() => {
    fetch('/theaters.json')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load theater data:', err)
        setLoading(false)
      })
  }, [])

  const toggleFavorite = useCallback((screeningId) => {
    setFavorites(prev => {
      const next = prev.includes(screeningId)
        ? prev.filter(id => id !== screeningId)
        : [...prev, screeningId]
      saveFavorites(next)
      return next
    })
  }, [])

  // Collect all unique formats from the data
  const allFormats = data
    ? [...new Set(
        data.theaters.flatMap(t =>
          t.screenings.map(s => s.format).filter(f => f && f !== 'digital')
        )
      )].sort()
    : []

  const getFilteredData = () => {
    if (!data) return null

    let theaters = data.theaters.map(theater => {
      let screenings = theater.screenings

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        screenings = screenings.filter(s =>
          s.title.toLowerCase().includes(q)
        )
      }

      if (tonightOnly) {
        const today = new Date().toISOString().split('T')[0]
        screenings = screenings.filter(s => s.date === today)
      } else if (thisWeekOnly) {
        const now = new Date()
        const weekLater = new Date(now)
        weekLater.setDate(weekLater.getDate() + 7)
        screenings = screenings.filter(s => {
          const d = new Date(s.date + 'T00:00:00')
          return d >= now && d <= weekLater
        })
      }

      if (formatFilter) {
        screenings = screenings.filter(s => s.format === formatFilter)
      }

      if (showFavoritesOnly) {
        screenings = screenings.filter(s => favorites.includes(s.id))
      }

      return { ...theater, screenings }
    })

    if (searchQuery.trim() || showFavoritesOnly) {
      theaters = theaters.filter(t => t.screenings.length > 0)
    }

    return { ...data, theaters }
  }

  const handleTonightClick = () => {
    setTonightOnly(!tonightOnly)
    if (!tonightOnly) setThisWeekOnly(false)
  }

  const handleThisWeekClick = () => {
    setThisWeekOnly(!thisWeekOnly)
    if (!thisWeekOnly) setTonightOnly(false)
  }

  const handleFormatClick = (fmt) => {
    setFormatFilter(prev => prev === fmt ? null : fmt)
  }

  if (loading) return <LoadingSpinner />

  if (!data) {
    return (
      <div className="error-state">
        <h2>Unable to load screening data</h2>
        <p>Please try refreshing the page.</p>
      </div>
    )
  }

  const filteredData = getFilteredData()

  return (
    <div className="app">
      <Header />
      <Nav />
      <div className="controls">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <div className="filter-chips">
          <button
            className={`filter-chip ${tonightOnly ? 'active' : ''}`}
            onClick={handleTonightClick}
          >
            Tonight
          </button>
          <button
            className={`filter-chip ${thisWeekOnly ? 'active' : ''}`}
            onClick={handleThisWeekClick}
          >
            This Week
          </button>
          <span className="filter-divider" />
          {allFormats.map(fmt => (
            <button
              key={fmt}
              className={`filter-chip format-chip ${formatFilter === fmt ? 'active' : ''}`}
              onClick={() => handleFormatClick(fmt)}
            >
              {fmt}
            </button>
          ))}
          <span className="filter-divider" />
          <button
            className={`filter-chip fav-chip ${showFavoritesOnly ? 'active' : ''}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            title="Show saved screenings"
          >
            {showFavoritesOnly ? '\u2605' : '\u2606'} Saved
          </button>
        </div>
      </div>
      <main className="main-content">
        <Routes>
          <Route path="/" element={
            <ByTheater data={filteredData} favorites={favorites} onToggleFavorite={toggleFavorite} />
          } />
          <Route path="/by-month" element={
            <ByMonth data={filteredData} favorites={favorites} onToggleFavorite={toggleFavorite} />
          } />
          <Route path="/screening/:screeningId" element={
            <Detail data={data} favorites={favorites} onToggleFavorite={toggleFavorite} />
          } />
        </Routes>
      </main>
      <Footer lastUpdated={data.lastUpdated} theaters={data.theaters} />
    </div>
  )
}

export default App
