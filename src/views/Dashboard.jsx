import { Link } from 'react-router-dom'
import './Dashboard.css'

function Dashboard({ data }) {
  if (!data || data.theaters.length === 0) {
    return <div className="empty-state">No screening data available.</div>
  }

  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const weekLater = new Date(now)
  weekLater.setDate(weekLater.getDate() + 7)

  // Collect all screenings with theater info
  const allScreenings = []
  data.theaters.forEach(theater => {
    theater.screenings.forEach(s => {
      allScreenings.push({
        ...s,
        theaterName: theater.shortName || theater.name,
        theaterFullName: theater.name,
        theaterColor: theater.color,
        theaterId: theater.id,
        neighborhood: theater.neighborhood,
      })
    })
  })

  // Sort chronologically
  allScreenings.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date)
    if (dateComp !== 0) return dateComp
    return (a.time || '').localeCompare(b.time || '')
  })

  // Tonight's screenings
  const tonightScreenings = allScreenings.filter(s => s.date === today)

  // This week's screenings (next 7 days, excluding today)
  const thisWeekScreenings = allScreenings.filter(s => {
    const d = new Date(s.date + 'T00:00:00')
    return d > now && d <= weekLater
  })

  // Upcoming screenings (future only)
  const upcomingScreenings = allScreenings.filter(s => s.date >= today)

  // Format breakdown
  const formatCounts = {}
  allScreenings.forEach(s => {
    const fmt = s.format || 'digital'
    formatCounts[fmt] = (formatCounts[fmt] || 0) + 1
  })
  const totalScreenings = allScreenings.length
  const formatEntries = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])

  // Theater breakdown
  const theaterStats = data.theaters.map(t => {
    const upcoming = t.screenings.filter(s => s.date >= today).length
    const nextScreening = t.screenings
      .filter(s => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0]
    return {
      id: t.id,
      name: t.shortName || t.name,
      fullName: t.name,
      color: t.color,
      neighborhood: t.neighborhood,
      total: t.screenings.length,
      upcoming,
      nextScreening,
    }
  }).sort((a, b) => b.upcoming - a.upcoming)

  // Unique neighborhoods
  const neighborhoods = [...new Set(data.theaters.map(t => t.neighborhood))].sort()

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatDateLong = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  return (
    <div className="dashboard">
      {/* ── Summary Stats ── */}
      <div className="dash-stats">
        <div className="stat-card">
          <span className="stat-number">{data.theaters.length}</span>
          <span className="stat-label">Theaters</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totalScreenings}</span>
          <span className="stat-label">Total Screenings</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{upcomingScreenings.length}</span>
          <span className="stat-label">Upcoming</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{tonightScreenings.length}</span>
          <span className="stat-label">Tonight</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{neighborhoods.length}</span>
          <span className="stat-label">Neighborhoods</span>
        </div>
      </div>

      {/* ── Tonight ── */}
      {tonightScreenings.length > 0 && (
        <section className="dash-section">
          <h2 className="dash-section-title">
            <span className="dash-section-icon">&#9733;</span>
            Tonight
          </h2>
          <div className="dash-tonight-grid">
            {tonightScreenings.map(s => (
              <Link key={s.id} to={`/screening/${s.id}`} className="tonight-card">
                <div className="tonight-card-accent" style={{ background: s.theaterColor }} />
                <div className="tonight-card-body">
                  <span className="tonight-title">{s.title}</span>
                  <div className="tonight-meta">
                    <span className="tonight-theater" style={{ color: s.theaterColor }}>{s.theaterName}</span>
                    <span className="tonight-time">{s.time}</span>
                    {s.format && s.format !== 'digital' && (
                      <span className="tonight-format">{s.format}</span>
                    )}
                  </div>
                  {s.notes && <p className="tonight-notes">{s.notes}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── This Week ── */}
      {thisWeekScreenings.length > 0 && (
        <section className="dash-section">
          <h2 className="dash-section-title">
            <span className="dash-section-icon">&#9670;</span>
            This Week
          </h2>
          <div className="dash-week-list">
            {thisWeekScreenings.map(s => (
              <Link key={s.id} to={`/screening/${s.id}`} className="week-item">
                <span className="week-date">{formatDate(s.date)}</span>
                <span className="week-title">{s.title}</span>
                <span className="week-theater" style={{ color: s.theaterColor }}>{s.theaterName}</span>
                <span className="week-time">{s.time}</span>
                {s.format && s.format !== 'digital' && (
                  <span className="week-format">{s.format}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="dash-two-col">
        {/* ── Format Breakdown ── */}
        <section className="dash-section">
          <h2 className="dash-section-title">
            <span className="dash-section-icon">&#9655;</span>
            Formats
          </h2>
          <div className="dash-formats">
            {formatEntries.map(([fmt, count]) => {
              const pct = Math.round((count / totalScreenings) * 100)
              return (
                <div key={fmt} className="format-row">
                  <span className="format-name">{fmt}</span>
                  <div className="format-bar-track">
                    <div
                      className="format-bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="format-count">{count}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Neighborhoods ── */}
        <section className="dash-section">
          <h2 className="dash-section-title">
            <span className="dash-section-icon">&#9670;</span>
            By Neighborhood
          </h2>
          <div className="dash-neighborhoods">
            {neighborhoods.map(hood => {
              const theaters = data.theaters.filter(t => t.neighborhood === hood)
              const screeningCount = theaters.reduce((sum, t) => sum + t.screenings.length, 0)
              return (
                <div key={hood} className="neighborhood-row">
                  <div className="neighborhood-info">
                    <span className="neighborhood-name">{hood}</span>
                    <span className="neighborhood-theaters">
                      {theaters.map(t => t.shortName || t.name).join(', ')}
                    </span>
                  </div>
                  <span className="neighborhood-count">{screeningCount}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── Theater Activity ── */}
      <section className="dash-section">
        <h2 className="dash-section-title">
          <span className="dash-section-icon">&#9733;</span>
          Theater Activity
        </h2>
        <div className="dash-theater-list">
          {theaterStats.map(t => (
            <div key={t.id} className="dash-theater-row">
              <div className="dash-theater-color" style={{ background: t.color }} />
              <div className="dash-theater-info">
                <span className="dash-theater-name">{t.fullName}</span>
                <span className="dash-theater-hood">{t.neighborhood}</span>
              </div>
              <div className="dash-theater-nums">
                <span className="dash-theater-upcoming">{t.upcoming} upcoming</span>
                <span className="dash-theater-total">{t.total} total</span>
              </div>
              {t.nextScreening && (
                <Link to={`/screening/${t.nextScreening.id}`} className="dash-theater-next">
                  <span className="dash-next-label">Next:</span>
                  <span className="dash-next-title">{t.nextScreening.title}</span>
                  <span className="dash-next-date">{formatDate(t.nextScreening.date)}</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Last Updated ── */}
      {data.lastUpdated && (
        <div className="dash-updated">
          Data last updated {formatDateLong(data.lastUpdated.split('T')[0])}
        </div>
      )}
    </div>
  )
}

export default Dashboard
