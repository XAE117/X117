import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import SearchBar from './components/SearchBar.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import GodfatherAlert from './components/GodfatherAlert.jsx'
import ByTheater from './views/ByTheater.jsx'
import ByMonth from './views/ByMonth.jsx'
import Detail from './views/Detail.jsx'
import './App.css'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [thisWeekOnly, setThisWeekOnly] = useState(false)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'theaters.json')
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

      if (thisWeekOnly) {
        const now = new Date()
        const weekLater = new Date(now)
        weekLater.setDate(weekLater.getDate() + 7)
        screenings = screenings.filter(s => {
          const d = new Date(s.date + 'T00:00:00')
          return d >= now && d <= weekLater
        })
      }

      return { ...theater, screenings }
    })

    if (searchQuery.trim()) {
      theaters = theaters.filter(t => t.screenings.length > 0)
    }

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
      <Nav />
      <GodfatherAlert data={data} />
      <div className="controls">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <button
          className={`week-filter ${thisWeekOnly ? 'active' : ''}`}
          onClick={() => setThisWeekOnly(!thisWeekOnly)}
        >
          This Week
        </button>
      </div>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ByTheater data={filteredData} />} />
          <Route path="/by-month" element={<ByMonth data={filteredData} />} />
          <Route path="/screening/:screeningId" element={<Detail data={data} />} />
        </Routes>
      </main>
      <Footer lastUpdated={data.lastUpdated} theaters={data.theaters} />
    </div>
  )
}

export default App
