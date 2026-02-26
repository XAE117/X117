import { useState, useMemo } from 'react'
import './GodfatherAlert.css'

function GodfatherAlert({ data }) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('godfather-alert-dismissed') === 'true'
  )

  const godfatherScreenings = useMemo(() => {
    if (!data) return []
    const matches = []
    data.theaters.forEach(theater => {
      theater.screenings.forEach(s => {
        if (/godfather/i.test(s.title)) {
          matches.push({ ...s, theaterName: theater.shortName, theaterColor: theater.color })
        }
      })
    })
    matches.sort((a, b) => new Date(a.date) - new Date(b.date))
    return matches
  }, [data])

  if (dismissed || godfatherScreenings.length === 0) return null

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('godfather-alert-dismissed', 'true')
  }

  return (
    <div className="godfather-alert">
      <div className="godfather-alert-inner">
        <button className="godfather-dismiss" onClick={handleDismiss} aria-label="Dismiss">&times;</button>
        <div className="godfather-alert-header">
          <span className="godfather-icon">&#127902;</span>
          <span className="godfather-headline">Liza &mdash; The Godfather is screening!</span>
        </div>
        <ul className="godfather-screenings">
          {godfatherScreenings.map(s => (
            <li key={s.id} className="godfather-screening-row">
              <span className="godfather-date">{formatDate(s.date)}</span>
              <span className="godfather-title">{s.title}</span>
              <span className="godfather-at">at</span>
              <span className="godfather-theater" style={{ color: s.theaterColor }}>{s.theaterName}</span>
              <span className="godfather-time">{s.time}</span>
              {s.format && s.format !== 'digital' && (
                <span className="godfather-format">{s.format}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default GodfatherAlert
