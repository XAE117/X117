import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import GodfatherAlert from './components/GodfatherAlert.jsx'
import ByTheater from './views/ByTheater.jsx'
import ByDay from './views/ByDay.jsx'
import Search from './views/Search.jsx'
import Detail from './views/Detail.jsx'
import './App.css'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [thisWeekOnly, setThisWeekOnly] = useState(false)

  const fetchData = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    const url = import.meta.env.BASE_URL + 'theaters.json?t=' + Date.now()
    fetch(url)
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
        setRefreshing(false)
      })
      .catch(err => {
        console.error('Failed to load theater data:', err)
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

    let theaters = data.theaters.map(theater => {
      // Always filter out past screenings
      let screenings = theater.screenings.filter(s => {
        const d = new Date(s.date + 'T00:00:00')
        return d >= today
      })

      if (thisWeekOnly) {
        const weekLater = new Date(today)
        weekLater.setDate(weekLater.getDate() + 7)
        screenings = screenings.filter(s => {
          const d = new Date(s.date + 'T00:00:00')
          return d <= weekLater
        })
      }

      return { ...theater, screenings }
    })

    return { ...data, theaters }
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
      <Nav thisWeekOnly={thisWeekOnly} onToggleThisWeek={() => setThisWeekOnly(!thisWeekOnly)} />
      <GodfatherAlert data={data} />
      <div className="controls">
        <button
          className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
          onClick={() => fetchData(true)}
          disabled={refreshing}
          title="Refresh listings"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ByTheater data={filteredData} />} />
          <Route path="/by-day" element={<ByDay data={filteredData} />} />
          <Route path="/search" element={<Search data={data} />} />
          <Route path="/screening/:screeningId" element={<Detail data={data} />} />
        </Routes>
      </main>
      <Footer lastUpdated={data.lastUpdated} theaters={data.theaters} />
    </div>
  )
}

export default App
