import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import DataFreshness from '../components/DataFreshness.jsx'
import { generatePlans, formatCostRange } from '../utils/generatePlan.js'
import { compareDatedEvents, hasEventStarted, parseTime, useNow } from '../utils/timeUtils.js'
import { isRestaurantOpenAt } from '../utils/restaurantHours.js'
import './EveningDashboard.css'

const EVENING_START = 17 * 60

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function collectCinema(data, date, now) {
  if (!data?.theaters) return []
  const items = []
  for (const theater of data.theaters) {
    for (const screening of theater.screenings || []) {
      if (
        screening.date !== date ||
        (parseTime(screening.time) ?? -1) < EVENING_START ||
        hasEventStarted(screening.date, screening.time, now)
      ) continue
      items.push({
        ...screening,
        theaterName: theater.shortName || theater.name,
        theaterColor: theater.color,
      })
    }
  }
  items.sort(compareDatedEvents)
  return items.filter((item, index, all) =>
    all.findIndex(candidate => candidate.title === item.title) === index
  ).slice(0, 3)
}

function collectJazz(data, date, now) {
  if (!data?.venues) return []
  const items = []
  for (const venue of data.venues) {
    for (const show of venue.shows || []) {
      if (
        show.date !== date ||
        (parseTime(show.time) ?? -1) < EVENING_START ||
        hasEventStarted(show.date, show.time, now)
      ) continue
      items.push({
        ...show,
        venueName: venue.shortName || venue.name,
        venueColor: venue.color,
      })
    }
  }
  return items.sort(compareDatedEvents).slice(0, 3)
}

function collectFood(data, date) {
  const dinnerTime = new Date(`${date}T18:00:00`)
  return [...(data?.restaurants || [])]
    .filter(restaurant =>
      Number.isFinite(restaurant.lat) &&
      Number.isFinite(restaurant.lng) &&
      isRestaurantOpenAt(restaurant.hours, dinnerTime)
    )
    .sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))
    .slice(0, 3)
}

function LineupCard({ plan, type }) {
  const activity = plan?.activity
  if (!plan?.restaurant || !activity) {
    return (
      <article className="dashboard-lineup dashboard-lineup-empty">
        <p>No fully validated {type === 'movie' ? 'movie' : 'jazz'} lineup tonight.</p>
      </article>
    )
  }

  const activityName = activity.title || activity.artist
  const activityRoute = type === 'movie'
    ? `/screening/${activity.id}`
    : `/jazz/show/${activity.id}`

  return (
    <article className={`dashboard-lineup dashboard-lineup-${type}`}>
      <div className="dashboard-lineup-kicker">
        {type === 'movie' ? 'DINNER + FILM' : 'DINNER + JAZZ'}
      </div>
      <div className="dashboard-lineup-flow">
        <Link to={`/food/spot/${plan.restaurant.id}`} className="dashboard-lineup-stop">
          <span className="dashboard-lineup-time">{plan.timeline?.dinnerTime}</span>
          <strong>{plan.restaurant.name}</strong>
          <span>{plan.restaurant.neighborhood || plan.restaurant.tier}</span>
        </Link>
        <span className="dashboard-lineup-arrow" aria-hidden="true">→</span>
        <Link to={activityRoute} className="dashboard-lineup-stop">
          <span className="dashboard-lineup-time">{activity.time}</span>
          <strong>{activityName}</strong>
          <span>{activity.theaterShortName || activity.venueShortName}</span>
        </Link>
      </div>
      <div className="dashboard-lineup-meta">
        <span>{plan.restaurant.distanceMiles.toFixed(1)} mi between stops</span>
        {plan.costEstimate && <span>{formatCostRange(plan.costEstimate)}</span>}
      </div>
    </article>
  )
}

function PickSection({ title, emoji, items, browseTo, renderItem }) {
  return (
    <section className="dashboard-picks">
      <div className="dashboard-section-header">
        <h2><span aria-hidden="true">{emoji}</span> {title}</h2>
        <Link to={browseTo}>Browse all →</Link>
      </div>
      <div className="dashboard-pick-grid">
        {items.length > 0
          ? items.map(renderItem)
          : <p className="dashboard-empty">Nothing listed for tonight yet.</p>}
      </div>
    </section>
  )
}

export default function EveningDashboard({ cinemaData, jazzData, foodData }) {
  const now = useNow()
  const today = localDateKey(now)
  const planningWindow = Math.floor(now.getTime() / (15 * 60 * 1000))
  const cinema = useMemo(() => collectCinema(cinemaData, today, now), [cinemaData, today, now])
  const jazz = useMemo(() => collectJazz(jazzData, today, now), [jazzData, today, now])
  const food = useMemo(() => collectFood(foodData, today), [foodData, today])
  const plans = useMemo(() => generatePlans({
    cinemaData,
    jazzData,
    foodData,
    date: today,
    now: new Date(planningWindow * 15 * 60 * 1000),
  }), [cinemaData, jazzData, foodData, today, planningWindow])

  const dayLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="evening-dashboard">
      <header className="dashboard-hero">
        <p className="dashboard-eyebrow">{dayLabel} · LOS ANGELES</p>
        <h1>Tonight, decided.</h1>
        <p>Two workable lineups, then the best nearby alternatives if you want to choose for yourself.</p>
        <div className="dashboard-hero-actions">
          <Link to="/roll" className="dashboard-roll-cta">🎲 Build my night</Link>
          <Link to="/search" className="dashboard-search-cta">Search everything</Link>
        </div>
      </header>

      <DataFreshness sources={[
        { label: 'Film', updated: cinemaData?.lastUpdated },
        { label: 'Jazz', updated: jazzData?.lastUpdated },
        { label: 'Food', updated: foodData?.lastUpdated },
      ]} />

      <section className="dashboard-lineups" aria-labelledby="lineups-title">
        <div className="dashboard-section-header">
          <h2 id="lineups-title">Ready-made lineups</h2>
          <Link to="/roll">Tune the vibe →</Link>
        </div>
        <div className="dashboard-lineup-grid">
          <LineupCard plan={plans.planA} type="movie" />
          <LineupCard plan={plans.planB} type="jazz" />
        </div>
        <p className="dashboard-lineup-proof">Restaurant hours and distance between stops are checked before a lineup appears.</p>
      </section>

      <PickSection
        title="Film"
        emoji="🎞️"
        items={cinema}
        browseTo="/browse"
        renderItem={item => (
          <Link key={item.id} to={`/screening/${item.id}`} className="dashboard-pick-card">
            <span className="dashboard-pick-time">{item.time}</span>
            <strong>{item.title}</strong>
            <span style={{ color: item.theaterColor }}>{item.theaterName}</span>
          </Link>
        )}
      />

      <PickSection
        title="Jazz"
        emoji="🎺"
        items={jazz}
        browseTo="/jazz"
        renderItem={item => (
          <Link key={item.id} to={`/jazz/show/${item.id}`} className="dashboard-pick-card">
            <span className="dashboard-pick-time">{item.time}</span>
            <strong>{item.artist}</strong>
            <span style={{ color: item.venueColor }}>{item.venueName}</span>
          </Link>
        )}
      />

      <PickSection
        title="Food"
        emoji="🍽️"
        items={food}
        browseTo="/food"
        renderItem={item => (
          <Link key={item.id} to={`/food/spot/${item.id}`} className="dashboard-pick-card">
            <span className="dashboard-pick-time">OPEN FOR DINNER · {item.price || item.priceRange || item.tier}</span>
            <strong>{item.name}</strong>
            <span>{item.neighborhood || item.cuisine}</span>
          </Link>
        )}
      />
    </div>
  )
}
