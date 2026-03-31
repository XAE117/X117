import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate, Link } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import ModeSwitcher from './components/ModeSwitcher.jsx'
import Footer from './components/Footer.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import FormatFilter from './components/FormatFilter.jsx'
import GodfatherAlert from './components/GodfatherAlert.jsx'
import ByTheater from './views/ByTheater.jsx'
import ByDay from './views/ByDay.jsx'
import Detail from './views/Detail.jsx'
import Watchlist from './views/Watchlist.jsx'
import MapView from './views/MapView.jsx'
import DayScreenshot from './views/DayScreenshot.jsx'
import Tonight from './views/Tonight.jsx'
import JazzTonight from './views/JazzTonight.jsx'
import JazzByVenue from './views/JazzByVenue.jsx'
import JazzByDay from './views/JazzByDay.jsx'
import JazzDetail from './views/JazzDetail.jsx'
import JazzMapView from './views/JazzMapView.jsx'
import JazzByProximity from './views/JazzByProximity.jsx'
import FoodByCategory from './views/FoodByCategory.jsx'
import FoodStarred from './views/FoodStarred.jsx'
import EatsByTier from './views/EatsByTier.jsx'
import EatsNew from './views/EatsNew.jsx'
import EatsDetail from './views/EatsDetail.jsx'
import EatsMapView from './views/EatsMapView.jsx'
import PizzaGuide from './views/PizzaGuide.jsx'
import Search from './views/Search.jsx'
import Splash from './views/Splash.jsx'
import './App.css'


const FILM_FORMATS = ['35mm', '70mm', '16mm', 'nitrate']
const NEW_RELEASE_MIN_YEAR = 2024

// Theaters excluded from the Favorites filter
const NON_FAVORITE_THEATERS = [
  'brain-dead',
  'billy-wilder',
  'redcat',
  'laemmle-nuart',
  'laemmle-noho',
  'los-feliz-3',
  'laemmle-royal',
  'vidiots',
]

// Smart default: redirect to Tonight on first cinema visit if it's evening (4-11pm)
function SmartCinemaDefault({ filteredData, searchQuery }) {
  const hour = new Date().getHours()
  const isEvening = hour >= 16 && hour < 23
  const hasRedirected = sessionStorage.getItem('palace-smart-routed')

  if (isEvening && !hasRedirected) {
    sessionStorage.setItem('palace-smart-routed', '1')
    return <Navigate to="/tonight" replace />
  }

  return <ByDay data={filteredData} searchQuery={searchQuery} />
}

function App() {
  const [data, setData] = useState(null)
  const [jazzData, setJazzData] = useState(null)
  const [foodData, setFoodData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [formatFilter, setFormatFilter] = useState('all')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isScrolling, setIsScrolling] = useState(false)
  const [splashSeen, setSplashSeen] = useState(() => {
    try { return sessionStorage.getItem('palace-splash-seen') === '1' } catch { return true }
  })
  const location = useLocation()

  const isJazzMode = location.pathname.startsWith('/jazz')
  const isFoodMode = location.pathname.startsWith('/food')

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Scroll detection: fade pills out when scrolling, back in after idle
  useEffect(() => {
    let scrollTimer
    const handleScroll = () => {
      setIsScrolling(true)
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => setIsScrolling(false), 200)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimer)
    }
  }, [])

  // Auto-collapse filter notch when switching between modes
  useEffect(() => {
    setFiltersExpanded(false)
  }, [isJazzMode, isFoodMode])

  // Dynamic page title per mode
  useEffect(() => {
    if (isFoodMode) {
      document.title = "LIZA'S PALACE — LA Restaurant Guide"
    } else if (isJazzMode) {
      document.title = "LIZA'S PALACE — LA Jazz & Live Music"
    } else {
      document.title = "LIZA'S PALACE — LA Repertory Cinema"
    }
  }, [isJazzMode, isFoodMode])

  const fetchData = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    const base = import.meta.env.BASE_URL
    const t = Date.now()

    Promise.all([
      fetch(base + 'theaters.json?t=' + t).then(res => res.json()),
      fetch(base + 'jazz-venues.json?t=' + t).then(res => res.json()).catch(() => null),
      fetch(base + 'restaurants.json?t=' + t).then(res => res.json()).catch(() => null),
    ])
      .then(([cinemaData, jazz, food]) => {
        setData(cinemaData)
        if (jazz) setJazzData(jazz)
        if (food) {
          // Normalize restaurant data — bridge field gaps between manual entries and scraper-added
          const TIER_COLORS = { street: '#FF6B35', feast: '#D4A574', whale: '#C9A84C', pizza: '#E84830' }
          if (food.restaurants) {
            food.restaurants.forEach(r => {
              // tier ↔ category
              if (!r.tier && r.category) r.tier = r.category
              if (!r.category) r.category = r.tier || 'feast'
              // price ↔ priceRange
              if (!r.priceRange && r.price) r.priceRange = r.price
              if (!r.price && r.priceRange) r.price = r.priceRange
              // bibGourmand → michelinStatus
              if (!r.michelinStatus && r.bibGourmand) r.michelinStatus = 'bib-gourmand'
              // defaults
              if (r.heatScore === undefined) r.heatScore = r.fire || 0
              if (!r.color) r.color = TIER_COLORS[r.tier] || TIER_COLORS.feast
              if (!r.neighborhood) r.neighborhood = ''
              if (!r.cuisine) r.cuisine = ''
            })
          }
          // Generate categories array for FoodByCategory view
          if (!food.categories) {
            food.categories = [
              { key: 'all', label: 'All' },
              { key: 'street', label: 'Street', description: 'Pop-ups & Stands · Under $20/pp' },
              { key: 'feast', label: 'Feast', description: 'The Sweet Spot · $20–$120/pp' },
              { key: 'whale', label: 'Whale', description: 'Fine Dining · $120+/pp' },
              { key: 'pizza', label: 'Pizza', description: 'LA\'s Best Pies · All Styles' },
            ]
          }
          setFoodData(food)
        }
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

    let theaterList = data.theaters

    // Favorites filter: exclude non-favorite theaters entirely
    if (formatFilter === 'favorites') {
      theaterList = theaterList.filter(t => !NON_FAVORITE_THEATERS.includes(t.id))
    }

    const theaters = theaterList.map(theater => {
      let screenings = theater.screenings.filter(s => {
        const d = new Date(s.date + 'T00:00:00')
        return d >= today
      })

      // Apply format filter (film only)
      if (formatFilter === 'film') {
        screenings = screenings.filter(s => {
          return FILM_FORMATS.includes(s.format?.toLowerCase())
        })
      }

      // Apply new release filter
      if (formatFilter === 'new') {
        const films = data.films || {}
        const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        screenings = screenings.filter(s => {
          const slug = slugify(s.title)
          const film = films[slug]
          return film && film.year >= NEW_RELEASE_MIN_YEAR
        })
      }

      return { ...theater, screenings }
    }).filter(theater => theater.screenings.length > 0)

    return { ...data, theaters }
  }

  // Show format filter on cinema list views
  const showFormatFilter = ['/', '/by-theater'].includes(location.pathname)

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

  const mode = isFoodMode ? 'food' : isJazzMode ? 'jazz' : 'cinema'

  // Detail pages render with minimal chrome (no header/nav/alerts/controls)
  const isSplashPage = location.pathname === '/welcome'
  const isDetailPage = isSplashPage || location.pathname.startsWith('/screening/') || location.pathname.startsWith('/jazz/show/')

  return (
    <div className={`app ${isJazzMode ? 'jazz-mode' : ''} ${isFoodMode ? 'food-mode' : ''} ${isScrolling ? 'ui-scrolling' : ''}`}>
      {!isDetailPage && (
        <div className="top-bar">
          <div className={`filter-notch ${filtersExpanded ? 'filter-notch--open' : ''}`}>
            {!filtersExpanded && (
              <div className="filter-notch-collapsed">
                <button
                  className="notch-toggle"
                  onClick={() => setFiltersExpanded(true)}
                  aria-label="Open filters"
                >
                  <span className="notch-plus">+</span>
                </button>
                {showFormatFilter && (
                  <FormatFilter current={formatFilter} onChange={setFormatFilter} expanded={false} />
                )}
                {isFoodMode && (
                  <div className="notch-food-pills">
                    <Link to="/food" className={`notch-food-pill ${location.pathname === '/food' ? 'active' : ''}`}>All</Link>
                    <Link to="/food/tiers" className={`notch-food-pill ${location.pathname === '/food/tiers' ? 'active' : ''}`}>Tiers</Link>
                    <Link to="/food/pizza" className={`notch-food-pill ${location.pathname === '/food/pizza' ? 'active' : ''}`}>Pizza</Link>
                  </div>
                )}
              </div>
            )}
            {filtersExpanded && (
              <div className="filter-notch-expanded">
                <button
                  className="notch-toggle"
                  onClick={() => setFiltersExpanded(false)}
                  aria-label="Close filters"
                >
                  <span className="notch-plus open">+</span>
                </button>
                {showFormatFilter && (
                  <>
                    <FormatFilter current={formatFilter} onChange={setFormatFilter} expanded={true} />
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
                    </button>
                  </>
                )}
                <div className="filter-notch-search">
                  <input
                    type="text"
                    className="expanded-search-input"
                    placeholder="Search films..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="expanded-search-clear" onClick={() => setSearchQuery('')}>
                      &times;
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <ModeSwitcher />
        </div>
      )}
      {!isDetailPage && !isJazzMode && !isFoodMode && <GodfatherAlert data={data} />}
      <main className="main-content">
        <Routes>
          {/* Splash */}
          <Route path="/welcome" element={<Splash onEnter={() => setSplashSeen(true)} />} />

          {/* Cinema routes */}
          <Route path="/" element={
            !splashSeen
              ? <Navigate to="/welcome" replace />
              : <SmartCinemaDefault filteredData={filteredData} searchQuery={searchQuery} />
          } />
          <Route path="/tonight" element={<Tonight data={filteredData} />} />
          <Route path="/by-theater" element={<ByTheater data={filteredData} />} />
          <Route path="/screening/:screeningId" element={<Detail data={data} />} />
          <Route path="/watchlist" element={<Watchlist data={data} />} />
          <Route path="/map" element={<MapView data={filteredData} />} />
          <Route path="/search" element={<Search data={filteredData} />} />

          {/* Jazz routes */}
          <Route path="/jazz" element={<JazzByDay data={jazzData} />} />
          <Route path="/jazz/tonight" element={<JazzTonight data={jazzData} />} />
          <Route path="/jazz/by-venue" element={<JazzByVenue data={jazzData} />} />
          <Route path="/jazz/show/:showId" element={<JazzDetail data={jazzData} />} />
          <Route path="/jazz/proximity" element={<JazzByProximity data={jazzData} />} />
          <Route path="/jazz/map" element={<JazzMapView data={jazzData} />} />

          {/* Food routes */}
          <Route path="/food" element={<FoodByCategory data={foodData} />} />
          <Route path="/food/pizza" element={<PizzaGuide data={foodData} />} />
          <Route path="/food/tiers" element={<EatsByTier data={foodData} />} />
          <Route path="/food/new" element={<EatsNew data={foodData} />} />
          <Route path="/food/starred" element={<FoodStarred data={foodData} />} />
          <Route path="/food/spot/:spotId" element={<EatsDetail data={foodData} />} />
          <Route path="/food/map" element={<EatsMapView data={foodData} />} />
          <Route path="*" element={
            <div style={{ color: '#E88A82', padding: '2rem', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              <p>No route matched: {window.location.pathname}</p>
              <p>basename: /X117</p>
            </div>
          } />
        </Routes>
      </main>
      <Footer
        lastUpdated={isJazzMode && jazzData ? jazzData.lastUpdated : isFoodMode && foodData ? foodData.lastUpdated : data?.lastUpdated}
        theaters={isJazzMode && jazzData ? jazzData.venues : data?.theaters}
        isJazz={isJazzMode}
        isFood={isFoodMode}
      />
      {!isDetailPage && <Nav mode={mode} />}
    </div>
  )
}

export default App
