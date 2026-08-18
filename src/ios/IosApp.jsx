import { useMemo, useState } from 'react'
import { useIosCatalog } from './useIosCatalog.js'
import {
  collectScreenings,
  directionsForCinema,
  directionsForRestaurant,
  formatCatalogTime,
  groupScreeningsByTitle,
  localDateKey,
  readableDate,
  tonightOrNextScreenings,
} from './format.js'

const TABS = [
  { id: 'tonight', label: 'Tonight', icon: '◐' },
  { id: 'browse', label: 'Browse', icon: '⌕' },
  { id: 'saved', label: 'Saved', icon: '♡' },
  { id: 'settings', label: 'Settings', icon: '⋯' },
]

function ExternalLink({ href, children, className = 'ios-link-button' }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children} <span aria-hidden="true">↗</span>
    </a>
  )
}

function CatalogState({ status, error, onRetry }) {
  if (status === 'loading') {
    return (
      <main className="ios-status-screen" aria-live="polite">
        <span className="ios-status-mark" aria-hidden="true">◐</span>
        <h1>Finding tonight.</h1>
        <p>Verifying the current SIXPM catalog.</p>
      </main>
    )
  }

  return (
    <main className="ios-status-screen" role="alert">
      <span className="ios-status-mark ios-status-mark-error" aria-hidden="true">!</span>
      <h1>Catalog unavailable.</h1>
      <p>{error?.message || 'SIXPM could not verify a current catalog.'}</p>
      <button type="button" className="ios-primary-button" onClick={() => onRetry()}>
        Try again
      </button>
      <p className="ios-status-note">A previously verified offline evening will appear here once you save one.</p>
    </main>
  )
}

function MovieCard({ movie, onSelect, compact = false }) {
  const primary = movie.primary
  const venueCount = new Set(movie.showings.map(showing => showing.theaterId)).size
  const venueLabel = venueCount === 1
    ? `${primary.theaterShortName} · ${primary.format || 'Standard'}`
    : `${venueCount} theaters · from ${primary.time}`
  return (
    <button type="button" className={`ios-card ios-movie-card${compact ? ' compact' : ''}`} onClick={() => onSelect({ type: 'cinema', item: movie })}>
      <span className="ios-card-kicker">{readableDate(primary.date)} · {primary.time}</span>
      <strong>{movie.title}</strong>
      <span>{venueLabel}</span>
    </button>
  )
}

function RestaurantCard({ restaurant, onSelect }) {
  return (
    <button type="button" className="ios-card ios-food-card" onClick={() => onSelect({ type: 'food', item: restaurant })}>
      <span className="ios-card-kicker">{restaurant.neighborhood || restaurant.cuisine}</span>
      <strong>{restaurant.name}</strong>
      <span>{restaurant.hours} · {restaurant.priceRange || restaurant.tier}</span>
    </button>
  )
}

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="ios-section-heading">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

function Tonight({ catalog, onSelect, onBrowse }) {
  const cinema = useMemo(() => groupScreeningsByTitle(
    tonightOrNextScreenings(catalog.feeds.cinema),
  ).slice(0, 3), [catalog])
  const food = catalog.feeds.food.data.restaurants || []
  const cinemaTitle = cinema.length > 0 && cinema[0].primary.date !== localDateKey()
    ? 'Next up'
    : 'Tonight’s film'

  return (
    <main className="ios-page ios-tonight-page">
      <header className="ios-hero">
        <p className="ios-eyebrow">LOS ANGELES · SIXPM</p>
        <h1>Make tonight<br />a little easier.</h1>
        <p>Current AMC showtimes, a small first-party food set, and no account required.</p>
      </header>

      <section className="ios-feature-card" aria-labelledby="ios-decide-heading">
        <p className="ios-eyebrow">START HERE</p>
        <h2 id="ios-decide-heading">Choose the movie. We’ll hold the rest.</h2>
        <p>Pick a showing, pair it with dinner, then save the whole evening for later.</p>
        <button type="button" className="ios-primary-button" onClick={() => onBrowse('film')}>
          Browse showtimes
        </button>
      </section>

      <section className="ios-section" aria-labelledby="ios-film-heading">
        <SectionHeader eyebrow="AMC CATALOG" title={cinemaTitle} action={<button type="button" className="ios-text-button" onClick={() => onBrowse('film')}>See all</button>} />
        <div className="ios-card-stack">
          {cinema.length > 0
            ? cinema.map(movie => <MovieCard key={movie.id} movie={movie} onSelect={onSelect} />)
            : <p className="ios-empty-copy">No verified upcoming AMC showtimes are available yet.</p>}
        </div>
      </section>

      <section className="ios-section" aria-labelledby="ios-food-heading">
        <SectionHeader eyebrow="SIXPM EDITORIAL" title="Dinner, kept simple" action={<button type="button" className="ios-text-button" onClick={() => onBrowse('food')}>See all</button>} />
        <div className="ios-card-stack">
          {food.map(restaurant => <RestaurantCard key={restaurant.id} restaurant={restaurant} onSelect={onSelect} />)}
        </div>
      </section>

      <aside className="ios-source-note">
        <strong>Jazz is not in iPhone V1 yet.</strong>
        <span>Its sources remain disabled until they have an explicit catalog approval.</span>
      </aside>
    </main>
  )
}

function Browse({ catalog, onSelect, browseMode, onChangeMode }) {
  const cinema = useMemo(() => groupScreeningsByTitle(
    collectScreenings(catalog.feeds.cinema),
  ), [catalog])
  const food = catalog.feeds.food.data.restaurants || []
  const items = browseMode === 'film' ? cinema : food

  return (
    <main className="ios-page">
      <header className="ios-page-header">
        <p className="ios-eyebrow">VERIFIED CATALOG</p>
        <h1>Browse</h1>
      </header>
      <div className="ios-segmented-control" role="tablist" aria-label="Catalog type">
        <button type="button" role="tab" aria-selected={browseMode === 'film'} className={browseMode === 'film' ? 'selected' : ''} onClick={() => onChangeMode('film')}>Film</button>
        <button type="button" role="tab" aria-selected={browseMode === 'food'} className={browseMode === 'food' ? 'selected' : ''} onClick={() => onChangeMode('food')}>Food</button>
      </div>
      <div className="ios-card-stack ios-browse-list" role="tabpanel">
        {browseMode === 'film'
          ? items.map(movie => <MovieCard key={movie.id} movie={movie} onSelect={onSelect} compact />)
          : items.map(item => <RestaurantCard key={item.id} restaurant={item} onSelect={onSelect} />)}
      </div>
    </main>
  )
}

function Saved() {
  return (
    <main className="ios-page ios-empty-page">
      <span className="ios-empty-symbol" aria-hidden="true">♡</span>
      <p className="ios-eyebrow">YOUR EVENINGS</p>
      <h1>Nothing saved yet.</h1>
      <p>When you save a film-and-dinner plan, it will stay available here even when you’re offline.</p>
    </main>
  )
}

function Settings({ catalog, status, onRefresh }) {
  const cinema = catalog.feeds.cinema
  return (
    <main className="ios-page">
      <header className="ios-page-header">
        <p className="ios-eyebrow">NO ACCOUNT. NO ADS.</p>
        <h1>Settings</h1>
      </header>
      <section className="ios-settings-card">
        <span>Catalog status</span>
        <strong>{status === 'refreshing' ? 'Refreshing…' : 'Verified'}</strong>
        <p>AMC showtimes updated {formatCatalogTime(cinema.generatedAt)}.</p>
        <button type="button" className="ios-secondary-button" onClick={() => onRefresh()} disabled={status === 'refreshing'}>
          Refresh catalog
        </button>
      </section>
      <section className="ios-settings-list" aria-label="App details">
        <div><span>Location</span><strong>Off until you ask</strong></div>
        <div><span>Calendar and reminders</span><strong>Used only when you save an evening</strong></div>
        <div><span>United States</span><strong>iPhone V1</strong></div>
      </section>
    </main>
  )
}

function Detail({ selection, onBack }) {
  const isCinema = selection.type === 'cinema'
  const item = selection.item
  const cinema = isCinema ? item.primary : null
  const directions = isCinema ? directionsForCinema(cinema) : directionsForRestaurant(item)
  const primaryLink = isCinema ? cinema.link : directions

  return (
    <main className="ios-page ios-detail-page">
      <button type="button" className="ios-back-button" onClick={onBack}>‹ Back</button>
      <p className="ios-eyebrow">{isCinema ? 'AMC SHOWTIME' : 'SIXPM EDITORIAL'}</p>
      <h1>{isCinema ? item.title : item.name}</h1>
      <div className="ios-detail-meta">
        {isCinema ? (
          <>
            <span>{readableDate(cinema.date)} · {cinema.time}</span>
            <span>{cinema.theaterName} · {cinema.format || 'Standard'}</span>
          </>
        ) : (
          <>
            <span>{item.neighborhood} · {item.cuisine}</span>
            <span>{item.hours}</span>
          </>
        )}
      </div>
      {!isCinema && <p className="ios-detail-copy">{item.description}</p>}
      {!isCinema && item.whyHot && <p className="ios-detail-note">{item.whyHot}</p>}
      {isCinema && item.showings.length > 1 && (
        <section className="ios-showtime-list" aria-label="Available showtimes">
          <h2>More showtimes</h2>
          {item.showings.map(showing => (
            <ExternalLink key={showing.id} href={showing.link} className="ios-showtime-link">
              {readableDate(showing.date)} · {showing.time} · {showing.theaterShortName} · {showing.format || 'Standard'}
            </ExternalLink>
          ))}
        </section>
      )}
      <div className="ios-detail-actions">
        <ExternalLink href={primaryLink} className="ios-primary-link">
          {isCinema ? 'AMC showtimes' : 'Get directions'}
        </ExternalLink>
        {isCinema && <ExternalLink href={directions}>Get directions</ExternalLink>}
      </div>
      <aside className="ios-detail-coming-soon">
        Save, Calendar, reminders, and sharing are added in the next native capability phase.
      </aside>
    </main>
  )
}

export default function IosApp() {
  const { catalog, status, error, refresh } = useIosCatalog()
  const [activeTab, setActiveTab] = useState('tonight')
  const [browseMode, setBrowseMode] = useState('film')
  const [selection, setSelection] = useState(null)

  const openBrowse = (mode) => {
    setBrowseMode(mode)
    setActiveTab('browse')
  }

  if (!catalog && status !== 'error') return <CatalogState status={status} error={error} onRetry={refresh} />
  if (!catalog) return <CatalogState status={status} error={error} onRetry={refresh} />

  const content = selection
    ? <Detail selection={selection} onBack={() => setSelection(null)} />
    : activeTab === 'tonight'
      ? <Tonight catalog={catalog} onSelect={setSelection} onBrowse={openBrowse} />
      : activeTab === 'browse'
        ? <Browse catalog={catalog} onSelect={setSelection} browseMode={browseMode} onChangeMode={setBrowseMode} />
        : activeTab === 'saved'
          ? <Saved />
          : <Settings catalog={catalog} status={status} onRefresh={refresh} />

  return (
    <div className="ios-app">
      {content}
      {!selection && (
        <nav className="ios-tab-bar" aria-label="Main navigation">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'active' : ''}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
