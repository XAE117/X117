import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DataFreshness from '../components/DataFreshness.jsx'
import { buildDiscoveryItems, filterDiscoveryItems } from '../utils/discovery.js'
import './Search.css'

const INITIAL_VISIBLE = 48

function formatDate(date) {
  if (!date) return null
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function ResultCard({ item }) {
  return (
    <Link className={`discovery-card discovery-card--${item.kind}`} to={item.href}>
      <span className="discovery-card-kind">{item.kind}</span>
      <h2>{item.name}</h2>
      <p>{item.venue}{item.neighborhood ? ` · ${item.neighborhood}` : ''}</p>
      <div className="discovery-card-meta">
        {item.date && <span>{formatDate(item.date)}</span>}
        {item.time && <span>{item.time}</span>}
        {item.format && item.format !== 'digital' && <span>{item.format}</span>}
        {item.price && <span>{item.price}</span>}
        {item.tier && <span>{item.tier}</span>}
      </div>
    </Link>
  )
}

function SelectFilter({ label, value, onChange, children }) {
  return (
    <label className="discovery-filter">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}

function Search({ cinemaData, jazzData, foodData }) {
  const [filters, setFilters] = useState({
    query: '',
    kind: 'all',
    date: 'all',
    radius: 'all',
    format: 'all',
    price: 'all',
    neighborhood: 'all',
    vibe: 'all',
    openNow: false,
  })
  const [visible, setVisible] = useState(INITIAL_VISIBLE)

  const items = useMemo(
    () => buildDiscoveryItems(cinemaData, jazzData, foodData),
    [cinemaData, jazzData, foodData],
  )
  const results = useMemo(() => filterDiscoveryItems(items, filters), [items, filters])
  const neighborhoods = useMemo(
    () => [...new Set(items.map(item => item.neighborhood).filter(Boolean))].sort(),
    [items],
  )

  const setFilter = (name, value) => {
    setFilters(current => ({ ...current, [name]: value }))
    setVisible(INITIAL_VISIBLE)
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      kind: 'all',
      date: 'all',
      radius: 'all',
      format: 'all',
      price: 'all',
      neighborhood: 'all',
      vibe: 'all',
      openNow: false,
    })
    setVisible(INITIAL_VISIBLE)
  }

  return (
    <div className="discovery-page">
      <header className="discovery-header">
        <div>
          <p className="discovery-eyebrow">Universal discovery</p>
          <h1>Find tonight’s move</h1>
          <p>Search films, jazz, and food in one place.</p>
        </div>
        <DataFreshness sources={[
          { label: 'Film', updated: cinemaData?.lastUpdated },
          { label: 'Jazz', updated: jazzData?.lastUpdated },
          { label: 'Food', updated: foodData?.lastUpdated },
        ]} />
      </header>

      <div className="discovery-search">
        <label htmlFor="universal-search">Search</label>
        <input
          id="universal-search"
          type="search"
          value={filters.query}
          onChange={event => setFilter('query', event.target.value)}
          placeholder="Film, artist, restaurant, venue, neighborhood…"
          autoFocus
        />
      </div>

      <section className="discovery-filters" aria-label="Discovery filters">
        <SelectFilter label="Type" value={filters.kind} onChange={value => setFilter('kind', value)}>
          <option value="all">Everything</option>
          <option value="film">Film</option>
          <option value="jazz">Jazz</option>
          <option value="food">Food</option>
        </SelectFilter>
        <SelectFilter label="Date" value={filters.date} onChange={value => setFilter('date', value)}>
          <option value="all">Any date</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
        </SelectFilter>
        <SelectFilter label="Radius" value={filters.radius} onChange={value => setFilter('radius', value)}>
          <option value="all">Any distance</option>
          <option value="3">Within 3 miles</option>
          <option value="5">Within 5 miles</option>
          <option value="8">Within 8 miles</option>
          <option value="12">Within 12 miles</option>
        </SelectFilter>
        <SelectFilter label="Format" value={filters.format} onChange={value => setFilter('format', value)}>
          <option value="all">Any format</option>
          <option value="35mm">35mm</option>
          <option value="70mm">70mm</option>
          <option value="16mm">16mm</option>
          <option value="nitrate">Nitrate</option>
          <option value="digital">Digital</option>
        </SelectFilter>
        <SelectFilter label="Price" value={filters.price} onChange={value => setFilter('price', value)}>
          <option value="all">Any price</option>
          <option value="street">Street</option>
          <option value="feast">Feast</option>
          <option value="whale">Whale</option>
        </SelectFilter>
        <SelectFilter label="Neighborhood" value={filters.neighborhood} onChange={value => setFilter('neighborhood', value)}>
          <option value="all">All neighborhoods</option>
          {neighborhoods.map(neighborhood => (
            <option key={neighborhood} value={neighborhood}>{neighborhood}</option>
          ))}
        </SelectFilter>
        <SelectFilter label="Vibe" value={filters.vibe} onChange={value => setFilter('vibe', value)}>
          <option value="all">Any vibe</option>
          <option value="casual">Casual</option>
          <option value="romantic">Romantic</option>
          <option value="adventure">Adventure</option>
          <option value="budget">Budget</option>
        </SelectFilter>
        <label className="discovery-toggle">
          <input
            type="checkbox"
            checked={filters.openNow}
            onChange={event => setFilter('openNow', event.target.checked)}
          />
          Open now
        </label>
        <button type="button" className="discovery-clear" onClick={clearFilters}>Clear</button>
      </section>

      <div className="discovery-summary" aria-live="polite">
        <strong>{results.length}</strong> matches
      </div>

      {results.length ? (
        <>
          <section className="discovery-results">
            {results.slice(0, visible).map(item => <ResultCard key={`${item.kind}-${item.id}`} item={item} />)}
          </section>
          {visible < results.length && (
            <button className="discovery-more" type="button" onClick={() => setVisible(value => value + INITIAL_VISIBLE)}>
              Show more
            </button>
          )}
        </>
      ) : (
        <div className="discovery-empty">
          <h2>No matches</h2>
          <p>Try widening the distance or clearing one of the filters.</p>
          <button type="button" onClick={clearFilters}>Clear filters</button>
        </div>
      )}
    </div>
  )
}

export default Search
