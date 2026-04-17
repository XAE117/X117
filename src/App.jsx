import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate, NavLink } from 'react-router-dom'
import ModeSwitcher from './components/ModeSwitcher.jsx'
import Footer from './components/Footer.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import FormatFilter from './components/FormatFilter.jsx'
import GodfatherAlert from './components/GodfatherAlert.jsx'
import BackPill from './components/BackPill.jsx'
import ByTheater from './views/ByTheater.jsx'
import ByDay from './views/ByDay.jsx'
import Detail from './views/Detail.jsx'
import Watchlist from './views/Watchlist.jsx'
import MapView from './views/MapView.jsx'
import DayScreenshot from './views/DayScreenshot.jsx'
import JazzByVenue from './views/JazzByVenue.jsx'
import JazzByDay from './views/JazzByDay.jsx'
import JazzDetail from './views/JazzDetail.jsx'
import JazzMapView from './views/JazzMapView.jsx'
import JazzByProximity from './views/JazzByProximity.jsx'
import JazzDayScreenshot from './views/JazzDayScreenshot.jsx'
import FoodByCategory from './views/FoodByCategory.jsx'
import FoodStarred from './views/FoodStarred.jsx'
import EatsByTier from './views/EatsByTier.jsx'
import EatsNew from './views/EatsNew.jsx'
import EatsDetail from './views/EatsDetail.jsx'
import EatsMapView from './views/EatsMapView.jsx'
import PizzaGuide from './views/PizzaGuide.jsx'
import TacoGuide from './views/TacoGuide.jsx'
import GuidePage from './views/GuidePage.jsx'
import Search from './views/Search.jsx'
import Splash from './views/Splash.jsx'
import DateNightGenerator from './views/DateNightGenerator.jsx'
import './App.css'


const FILM_FORMATS = ['35mm', '70mm', '16mm', 'nitrate']
const NEW_RELEASE_MIN_YEAR = 2024

// Theaters included in the Favorites filter
const FAVORITE_THEATERS = [
  'vista-theatre',
  'alamo-dtla',
  'egyptian',
  'los-feliz-3',
  'new-beverly',
  'academy-museum',
]

function SmartCinemaDefault({ filteredData, searchQuery }) {
  return <ByDay data={filteredData} searchQuery={searchQuery} />
}

function App() {
  const [data, setData] = useState(null)
  const [jazzData, setJazzData] = useState(null)
  const [foodData, setFoodData] = useState(null)
  const [guideData, setGuideData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [formatFilter, setFormatFilter] = useState('all')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isScrolling, setIsScrolling] = useState(false)
  const [foodDropdown, setFoodDropdown] = useState(null) // 'tiers' | 'specialty' | null
  const [splashSeen, setSplashSeen] = useState(() => {
    try { return sessionStorage.getItem('palace-splash-seen') === '1' } catch { return true }
  })
  const location = useLocation()

  const isJazzMode = location.pathname.startsWith('/jazz')
  const isGuideMode = location.pathname === '/guide'
  const isFoodMode = location.pathname.startsWith('/food') || isGuideMode
  const isRollMode = location.pathname === '/roll'

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
    setFoodDropdown(null)
  }, [isJazzMode, isFoodMode])

  // Close food dropdown on route change
  useEffect(() => {
    setFoodDropdown(null)
  }, [location.pathname])

  // Dynamic page title per mode
  useEffect(() => {
    if (isRollMode) {
      document.title = "SIXPM — Tonight's Lineup"
    } else if (isGuideMode) {
      document.title = "SIXPM — The Corn & Fire Companion"
    } else if (isFoodMode) {
      document.title = "SIXPM — LA Restaurant Guide"
    } else if (isJazzMode) {
      document.title = "SIXPM — LA Jazz & Live Music"
    } else {
      document.title = "SIXPM — LA Repertory Cinema"
    }
  }, [isJazzMode, isFoodMode, isGuideMode, isRollMode])

  const fetchData = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    const base = import.meta.env.BASE_URL
    const t = Date.now()

    Promise.all([
      fetch(base + 'theaters.json?t=' + t).then(res => res.json()),
      fetch(base + 'jazz-venues.json?t=' + t).then(res => res.json()).catch(() => null),
      fetch(base + 'restaurants.json?t=' + t).then(res => res.json()).catch(() => null),
      fetch(base + 'guide-restaurants.json?t=' + t).then(res => res.json()).catch(() => null),
    ])
      .then(([cinemaData, jazz, food, guide]) => {
        setData(cinemaData)
        if (jazz) setJazzData(jazz)
        if (food) {
          // Normalize restaurant data — bridge field gaps between manual entries and scraper-added
          const TIER_COLORS = { street: '#FF6B35', feast: '#D4A574', whale: '#C9A84C', pizza: '#E84830', tacos: '#7CB342' }
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
              { key: 'tacos', label: 'Tacos', description: 'The Global Capital · All Styles' },
            ]
          }
          setFoodData(food)
        }
        if (guide) setGuideData(guide)
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

    // Favorites filter: show only curated theaters
    if (formatFilter === 'favorites') {
      theaterList = theaterList.filter(t => FAVORITE_THEATERS.includes(t.id))
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

  // Screenshot views render standalone — no nav/header/footer chrome
  if (location.pathname.startsWith('/day/') || location.pathname.startsWith('/jazz/day/')) {
    return (
      <Routes>
        <Route path="/day/:date" element={<DayScreenshot data={data} />} />
        <Route path="/jazz/day/:date" element={<JazzDayScreenshot data={jazzData} />} />
      </Routes>
    )
  }

  const mode = isRollMode ? 'roll' : isFoodMode ? 'food' : isJazzMode ? 'jazz' : 'cinema'

  // Detail pages render with minimal chrome (no header/nav/alerts/controls)
  const isSplashPage = location.pathname === '/welcome'
  const isDetailPage = isSplashPage || location.pathname.startsWith('/screening/') || location.pathname.startsWith('/jazz/show/')
  const showBackPill = location.pathname.startsWith('/screening/') || location.pathname.startsWith('/jazz/show/') || location.pathname.startsWith('/food/spot/')

  return (
    <div className={`app ${isJazzMode ? 'jazz-mode' : ''} ${isFoodMode ? 'food-mode' : ''} ${isGuideMode ? 'guide-mode' : ''} ${isRollMode ? 'roll-mode' : ''} ${isScrolling ? 'ui-scrolling' : ''}`}>
      {!isDetailPage && (
        <div className="top-bar">
          {!isRollMode && <div className={`filter-notch ${filtersExpanded ? 'filter-notch--open' : ''}`}>
            {!filtersExpanded && (
              <div className="filter-notch-collapsed">
                <button
                  className="notch-toggle"
                  onClick={() => setFiltersExpanded(true)}
                  aria-label="Open menu"
                >
                  <span className="notch-plus">+</span>
                </button>
              </div>
            )}
            {filtersExpanded && (
              <div className="filter-notch-expanded">
                <button
                  className="notch-toggle notch-toggle--close"
                  onClick={() => setFiltersExpanded(false)}
                  aria-label="Close menu"
                >
                  <span className="notch-plus open">+</span>
                </button>

                {/* Nav rows — mode-specific */}
                <div className="notch-nav-group">
                  {isJazzMode && [
                    { to: '/jazz', end: true, emoji: '📍', label: 'By Day' },
                    { to: '/jazz/by-venue', emoji: '🏛️', label: 'Venues' },
                    { to: '/jazz/proximity', emoji: '📡', label: 'LC ℃' },
                    { to: '/jazz/map', emoji: '🗺️', label: 'Map' },
                  ].map((item, i, arr) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `notch-nav-row ${isActive ? 'active' : ''}`}
                      onClick={() => setFiltersExpanded(false)}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <span className="notch-nav-emoji">{item.emoji}</span>
                      <span className="notch-nav-label">{item.label}</span>
                    </NavLink>
                  ))}

                  {isFoodMode && [
                    { to: '/food', end: true, emoji: '🍽️', label: 'All' },
                    { to: '/food/tacos', emoji: '🌮', label: 'Tacos' },
                    { to: '/food/pizza', emoji: '🍕', label: 'Pizza' },
                    { to: '/food/starred', emoji: '⭐', label: 'Starred' },
                    { to: '/food/map', emoji: '📍', label: 'Hoods' },
                    { to: '/guide', emoji: '📖', label: 'Guide' },
                  ].map((item, i) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `notch-nav-row ${isActive ? 'active' : ''}`}
                      onClick={() => setFiltersExpanded(false)}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <span className="notch-nav-emoji">{item.emoji}</span>
                      <span className="notch-nav-label">{item.label}</span>
                    </NavLink>
                  ))}

                  {!isJazzMode && !isFoodMode && [
                    { to: '/', end: true, emoji: '📍', label: 'By Day' },
                    { to: '/by-theater', emoji: '🏛️', label: 'Theaters' },
                    { to: '/watchlist', emoji: '💛', label: 'Watchlist' },
                    { to: '/map', emoji: '🗺️', label: 'Map' },
                  ].map((item, i) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `notch-nav-row ${isActive ? 'active' : ''}`}
                      onClick={() => setFiltersExpanded(false)}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <span className="notch-nav-emoji">{item.emoji}</span>
                      <span className="notch-nav-label">{item.label}</span>
                    </NavLink>
                  ))}
                </div>

                {/* Format filters + search — film mode only */}
                {showFormatFilter && (
                  <>
                    <div className="notch-double-divider" />
                    <div className="notch-nav-group">
                      {[
                        { key: 'all', emoji: '🪩', label: 'All' },
                        { key: 'film', emoji: '📽️', label: 'Film' },
                        { key: 'new', emoji: '⭐', label: 'New' },
                        { key: 'favorites', emoji: '✨', label: 'Faves' },
                      ].map((f, i) => (
                        <button
                          key={f.key}
                          className={`notch-nav-row notch-filter-row ${formatFilter === f.key ? 'active' : ''}`}
                          onClick={() => { setFormatFilter(f.key); setFiltersExpanded(false) }}
                          style={{ animationDelay: `${(i + 4) * 0.05}s` }}
                        >
                          <span className="notch-nav-emoji">{f.emoji}</span>
                          <span className="notch-nav-label">{f.label}</span>
                          <button
                            className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
                            style={{ display: f.key === 'all' ? 'inline-flex' : 'none', marginLeft: 'auto' }}
                            onClick={(e) => { e.stopPropagation(); fetchData(true) }}
                            disabled={refreshing}
                            title="Refresh listings"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <path d="M23 4v6h-6" />
                              <path d="M1 20v-6h6" />
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                          </button>
                        </button>
                      ))}
                    </div>
                    <div className="filter-notch-search notch-search-row">
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
                  </>
                )}
              </div>
            )}
          </div>}
          {/* Centered dice pill — always visible, teases the Roll page */}
          {!isRollMode && (
            <NavLink to="/roll" className="dice-pill" aria-label="Roll date night">
              🎲
            </NavLink>
          )}
          <ModeSwitcher />
        </div>
      )}
      {!isDetailPage && !isJazzMode && !isFoodMode && !isGuideMode && !isRollMode && <GodfatherAlert data={data} />}
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
          <Route path="/by-theater" element={<ByTheater data={filteredData} />} />
          <Route path="/screening/:screeningId" element={<Detail data={data} />} />
          <Route path="/watchlist" element={<Watchlist data={data} />} />
          <Route path="/map" element={<MapView data={filteredData} />} />
          <Route path="/search" element={<Search data={filteredData} />} />

          {/* Jazz routes */}
          <Route path="/jazz" element={<JazzByDay data={jazzData} />} />
          <Route path="/jazz/by-venue" element={<JazzByVenue data={jazzData} />} />
          <Route path="/jazz/show/:showId" element={<JazzDetail data={jazzData} />} />
          <Route path="/jazz/proximity" element={<JazzByProximity data={jazzData} />} />
          <Route path="/jazz/map" element={<JazzMapView data={jazzData} />} />

          {/* Food routes */}
          <Route path="/food" element={<FoodByCategory data={foodData} />} />
          <Route path="/food/pizza" element={<PizzaGuide data={foodData} />} />
          <Route path="/food/tacos" element={<TacoGuide data={foodData} />} />
          <Route path="/food/tiers" element={<EatsByTier data={foodData} />} />
          <Route path="/food/new" element={<EatsNew data={foodData} />} />
          <Route path="/food/starred" element={<FoodStarred data={foodData} />} />
          <Route path="/food/spot/:spotId" element={<EatsDetail data={foodData} />} />
          <Route path="/food/map" element={<EatsMapView data={foodData} />} />

          {/* Date Night Generator */}
          <Route path="/roll" element={<DateNightGenerator cinemaData={data} jazzData={jazzData} foodData={foodData} />} />

          {/* Guide route */}
          <Route path="/guide" element={<GuidePage guideData={guideData} />} />
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
      {showBackPill && <BackPill />}
    </div>
  )
}

export default App
