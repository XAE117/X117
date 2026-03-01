import { useState, useMemo, useEffect, useRef } from 'react'
import './GodfatherAlert.css'

const APP_URL = 'https://xae117.github.io/X117/'

function sendGodfatherNotification(screenings) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (sessionStorage.getItem('godfather-notified') === 'true') return

  const count = screenings.length
  const next = screenings[0]
  const body = `${count} screening${count > 1 ? 's' : ''} coming up!\n` +
    `Next: ${next.title} at ${next.theaterName} — ${next.date} ${next.time}\n` +
    `Tap to see all screenings`

  const notification = new Notification('The Godfather is screening!', {
    body,
    icon: '🎬',
    tag: 'godfather-alert',
    requireInteraction: true,
  })

  notification.onclick = () => {
    window.focus()
    window.open(APP_URL, '_self')
    notification.close()
  }

  sessionStorage.setItem('godfather-notified', 'true')
}

function GodfatherAlert({ data }) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('godfather-alert-dismissed') === 'true'
  )
  const notificationSent = useRef(false)

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

  // Request notification permission and send notification
  useEffect(() => {
    if (notificationSent.current) return
    if (godfatherScreenings.length === 0) return
    notificationSent.current = true

    if (!('Notification' in window)) return

    if (Notification.permission === 'granted') {
      sendGodfatherNotification(godfatherScreenings)
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          sendGodfatherNotification(godfatherScreenings)
        }
      })
    }
  }, [godfatherScreenings])

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
          <span className="godfather-icon">&#127903;</span>
          <span className="godfather-headline">Leave the gun, bring the cannoli &mdash; The Godfather is screening!</span>
        </div>
        <ul className="godfather-screenings">
          {godfatherScreenings.map(s => (
            <li key={s.id} className="godfather-screening-row">
              <span className="godfather-date">{formatDate(s.date)}</span>
              <a href={s.link} target="_blank" rel="noopener noreferrer" className="godfather-title-link">{s.title}</a>
              <span className="godfather-at">at</span>
              <span className="godfather-theater" style={{ color: s.theaterColor }}>{s.theaterName}</span>
              <span className="godfather-time">{s.time}</span>
              {s.format && s.format !== 'digital' && (
                <span className="godfather-format">{s.format}</span>
              )}
              <a href={s.link} target="_blank" rel="noopener noreferrer" className="godfather-tickets" aria-label="Tickets">&#127903;</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default GodfatherAlert
