import { useEffect, useMemo, useState } from 'react'
import { SavedEveningDetail, SavedEvenings } from './SavedEveningViews.jsx'
import { useIosCatalog } from './useIosCatalog.js'
import { nativeAdapter } from './native/nativeAdapter.js'
import { useNetworkStatus } from './useNetworkStatus.js'
import {
  calendarEventForSavedEvening,
  notificationIdForSavedEvening,
  reminderForSavedEvening,
  shareContentForSavedEvening,
} from './savedEvenings.js'
import { useSavedEvenings } from './useSavedEvenings.js'
import {
  collectScreenings,
  directionsForCinema,
  directionsForRestaurant,
  formatCatalogTime,
  formatDistanceMiles,
  formatScreeningTime,
  groupScreeningsByTitle,
  localDateKey,
  readableDate,
  sortRestaurantsByDistance,
  tonightOrNextScreenings,
} from './format.js'

const TABS = [
  { id: 'tonight', label: 'Tonight', index: '01' },
  { id: 'browse', label: 'Catalog', index: '02' },
  { id: 'saved', label: 'Saved', index: '03' },
  { id: 'settings', label: 'Notes', index: '04' },
]

const emptyDraft = () => ({ cinema: null, food: null })

function ExternalLink({ href, children, className = 'ios-link-button' }) {
  const [error, setError] = useState(null)
  const [opening, setOpening] = useState(false)
  if (!href) return null

  const handleClick = async (event) => {
    if (!nativeAdapter.isNativeIos) return
    event.preventDefault()
    setOpening(true)
    setError(null)
    try {
      await nativeAdapter.openExternal(href)
    } catch (nextError) {
      setError(nextError.message || 'Could not open that link.')
    } finally {
      setOpening(false)
    }
  }

  return (
    <span className="ios-external-link-wrap">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-busy={opening || undefined}
        onClick={handleClick}
      >
        {children} <span aria-hidden="true">↗</span>
      </a>
      {error && <span className="ios-inline-error" role="alert">{error}</span>}
    </span>
  )
}

function CatalogState({ status, error, onRetry, savedCount, onOpenSaved }) {
  const savedLabel = `Open ${savedCount} saved evening${savedCount === 1 ? '' : 's'}`
  if (status === 'loading') {
    return (
      <main className="ios-status-screen" aria-live="polite">
        <span className="ios-status-mark" aria-hidden="true">◐</span>
        <h1>Finding tonight.</h1>
        <p>Verifying the current SIXPM catalog.</p>
        {savedCount > 0 && <button type="button" className="ios-secondary-button" onClick={onOpenSaved}>{savedLabel}</button>}
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
      {savedCount > 0 && <button type="button" className="ios-secondary-button" onClick={onOpenSaved}>{savedLabel}</button>}
      <p className="ios-status-note">Saved plans stay on this iPhone only while their provider details remain current.</p>
    </main>
  )
}

function DecoRule({ compact = false }) {
  return (
    <div className={`ios-deco-rule${compact ? ' compact' : ''}`} aria-hidden="true">
      <span>◆</span>
    </div>
  )
}

function MovieCard({ movie, onSelect, compact = false }) {
  const primary = movie.primary
  const venueCount = new Set(movie.showings.map(showing => showing.theaterId)).size
  const venueLabel = (primary.theaterShortName || primary.theaterName || 'AMC').replace(/^AMC\s+/i, '')
  const showtimeNote = venueCount === 1 ? 'Current AMC showing' : `${venueCount} AMC theaters`
  const detail = compact ? `${readableDate(primary.date)} · ${showtimeNote}` : showtimeNote
  return (
    <button type="button" className={`ios-listing ios-movie-listing${compact ? ' compact' : ''}`} onClick={() => onSelect({ type: 'cinema', item: movie })}>
      <span className="ios-listing-venue">{venueLabel}</span>
      <span className="ios-listing-copy">
        <strong>{movie.title}</strong>
        <span className="ios-listing-details">{detail}</span>
      </span>
      <span className="ios-listing-when">
        <span>{formatScreeningTime(primary.time)}</span>
        {primary.format && primary.format !== 'Standard' && <span className="ios-format-badge">{primary.format}</span>}
      </span>
    </button>
  )
}

function shortRestaurantNeighborhood(value) {
  if (!value) return 'SIXPM'
  const locations = value.match(/\((\d+)\s+locations?\)/i)
  if (!locations) return value
  const firstNeighborhood = value.split('/')[0].trim()
  const additionalCount = Math.max(0, Number(locations[1]) - 1)
  return additionalCount > 0 ? `${firstNeighborhood} + ${additionalCount}` : firstNeighborhood
}

function RestaurantCard({ restaurant, onSelect }) {
  const distance = formatDistanceMiles(restaurant.distanceMiles)
  const neighborhood = shortRestaurantNeighborhood(restaurant.neighborhood || restaurant.cuisine)
  return (
    <button type="button" className="ios-listing ios-food-listing" onClick={() => onSelect({ type: 'food', item: restaurant })}>
      <span className="ios-listing-venue">{neighborhood}</span>
      <span className="ios-listing-copy">
        <strong>{restaurant.name}</strong>
        <span className="ios-listing-details">{restaurant.cuisine || 'Dinner'}{distance ? ` · ${distance}` : ''}</span>
      </span>
      <span className="ios-listing-when ios-food-when">
        <span>{restaurant.priceRange || restaurant.tier || 'Dinner'}</span>
        <span>{restaurant.hours || 'Hours listed'}</span>
      </span>
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

function OfflineCatalogNotice({ status }) {
  if (status !== 'offline') return null
  return (
    <aside className="ios-offline-notice" role="status">
      <strong>Offline catalog</strong>
      <span>Showing the last verified picks still inside their approved provider windows.</span>
    </aside>
  )
}

function EveningDraftBanner({ draft, onReview, onChoose, onClear }) {
  const hasCinema = Boolean(draft.cinema)
  const hasFood = Boolean(draft.food)
  if (!hasCinema && !hasFood) return null

  const complete = hasCinema && hasFood
  const nextLabel = hasCinema ? 'Choose dinner' : 'Choose a film'
  return (
    <aside className="ios-draft-banner" aria-label="Evening in progress">
      <DecoRule compact />
      <div>
        <p className="ios-eyebrow">HELD FOR TONIGHT</p>
        <strong>{complete ? 'A film and dinner, held together.' : `One choice held. ${nextLabel}.`}</strong>
        <span>{hasCinema ? draft.cinema.title : 'No film yet'} · {hasFood ? draft.food.name : 'No dinner yet'}</span>
      </div>
      <div className="ios-draft-banner-actions">
        <button type="button" className="ios-secondary-button" onClick={complete ? onReview : onChoose}>
          {complete ? 'Review evening' : nextLabel}
        </button>
        <button type="button" className="ios-text-button" onClick={onClear}>Clear</button>
      </div>
    </aside>
  )
}

function Tonight({ catalog, catalogStatus, location, onSelect, onBrowse, draft, onReviewDraft, onChooseDraft, onClearDraft }) {
  const cinema = useMemo(() => groupScreeningsByTitle(
    tonightOrNextScreenings(catalog.feeds.cinema),
  ).slice(0, 3), [catalog])
  const food = useMemo(() => sortRestaurantsByDistance(
    catalog.feeds.food.data.restaurants || [],
    location,
  ), [catalog, location])
  const cinemaTitle = cinema.length > 0 && cinema[0].primary.date !== localDateKey()
    ? 'Next up'
    : 'Tonight’s film'
  const foodTitle = location ? 'Dinner nearby' : 'Dinner, kept simple'
  const foodEyebrow = location ? 'NEARBY · SIXPM EDITORIAL' : 'SIXPM EDITORIAL'
  const dispatchDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="ios-page ios-tonight-page">
      <header className="ios-hero">
        <p className="ios-hero-kicker">THE LOS ANGELES EVENING GUIDE</p>
        <h1>SIXPM</h1>
        <p className="ios-hero-date">{dispatchDate}</p>
        <DecoRule />
        <p className="ios-hero-caption">A current cinema listing and a small dinner notebook for the part of Los Angeles that begins after work.</p>
      </header>

      <OfflineCatalogNotice status={catalogStatus} />

      <section className="ios-dispatch" aria-labelledby="ios-decide-heading">
        <p className="ios-eyebrow">THE FIRST PICK</p>
        <h2 id="ios-decide-heading">Choose a showing.<br />Make a night of it.</h2>
        <p>Pair a verified AMC screening with dinner, then keep the whole evening on this iPhone.</p>
        <button type="button" className="ios-primary-button" onClick={() => onBrowse('film')}>
          <span>Browse AMC listings</span><span aria-hidden="true">→</span>
        </button>
      </section>

      <EveningDraftBanner draft={draft} onReview={onReviewDraft} onChoose={onChooseDraft} onClear={onClearDraft} />

      <section className="ios-section" aria-labelledby="ios-film-heading">
        <SectionHeader eyebrow="AMC CATALOG" title={cinemaTitle} action={<button type="button" className="ios-text-button" onClick={() => onBrowse('film')}>See all</button>} />
        <div className="ios-listing-stack">
          {cinema.length > 0
            ? cinema.map(movie => <MovieCard key={movie.id} movie={movie} onSelect={onSelect} />)
            : <p className="ios-empty-copy">No verified upcoming AMC showtimes are available yet.</p>}
        </div>
      </section>

      <section className="ios-section" aria-labelledby="ios-food-heading">
        <SectionHeader eyebrow={foodEyebrow} title={foodTitle} action={<button type="button" className="ios-text-button" onClick={() => onBrowse('food')}>See all</button>} />
        <div className="ios-listing-stack">
          {food.map(restaurant => <RestaurantCard key={restaurant.id} restaurant={restaurant} onSelect={onSelect} />)}
        </div>
      </section>

      <aside className="ios-source-note">
        <DecoRule compact />
        <strong>Made for the evening, not the feed.</strong>
        <span>Provider details are kept only while their approved freshness windows remain open. No account, ads, or tracking.</span>
      </aside>
    </main>
  )
}

function Browse({ catalog, catalogStatus, location, onSelect, browseMode, onChangeMode, draft, onReviewDraft, onChooseDraft, onClearDraft }) {
  const cinema = useMemo(() => groupScreeningsByTitle(
    collectScreenings(catalog.feeds.cinema),
  ), [catalog])
  const food = useMemo(() => sortRestaurantsByDistance(
    catalog.feeds.food.data.restaurants || [],
    location,
  ), [catalog, location])
  const items = browseMode === 'film' ? cinema : food
  const directoryTitle = browseMode === 'film' ? <>Film<br />directory</> : <>Dinner<br />notebook</>

  return (
    <main className="ios-page">
      <header className="ios-page-header">
        <p className="ios-eyebrow">LOS ANGELES · CURRENT EDITION</p>
        <h1>{directoryTitle}</h1>
        <DecoRule compact />
      </header>
      <OfflineCatalogNotice status={catalogStatus} />
      <EveningDraftBanner draft={draft} onReview={onReviewDraft} onChoose={onChooseDraft} onClear={onClearDraft} />
      <div className="ios-segmented-control" aria-label="Catalog type">
        <button type="button" aria-pressed={browseMode === 'film'} className={browseMode === 'film' ? 'selected' : ''} onClick={() => onChangeMode('film')}><span aria-hidden="true">01</span> Film</button>
        <button type="button" aria-pressed={browseMode === 'food'} className={browseMode === 'food' ? 'selected' : ''} onClick={() => onChangeMode('food')}><span aria-hidden="true">02</span> Dinner</button>
      </div>
      <div className="ios-listing-stack ios-browse-list">
        {browseMode === 'film'
          ? items.map(movie => <MovieCard key={movie.id} movie={movie} onSelect={onSelect} compact />)
          : items.map(item => <RestaurantCard key={item.id} restaurant={item} onSelect={onSelect} />)}
      </div>
    </main>
  )
}

function EveningDraftReview({ draft, onBack, onSave, onChoose, onClear, actionMessage }) {
  const canSave = Boolean(draft.cinema && draft.food)
  return (
    <main className="ios-page ios-detail-page">
      <button type="button" className="ios-back-button" onClick={onBack}>← Return to catalog</button>
      <p className="ios-eyebrow">EVENING COMPOSED</p>
      <h1>One good<br />night.</h1>
      <DecoRule compact />
      <p className="ios-draft-intro">SIXPM stores this pair on this iPhone only, and removes provider details when their approved freshness windows end.</p>
      <section className="ios-saved-detail-block">
        <h2>Film</h2>
        {draft.cinema ? (
          <>
            <p>{draft.cinema.title}</p>
            <p>{readableDate(draft.cinema.date)} · {formatScreeningTime(draft.cinema.time)} · {draft.cinema.theaterShortName}</p>
          </>
        ) : <p>Choose a verified AMC showing to continue.</p>}
      </section>
      <section className="ios-saved-detail-block">
        <h2>Dinner</h2>
        {draft.food ? (
          <>
            <p>{draft.food.name} · {draft.food.cuisine}</p>
            <p>{draft.food.neighborhood} · {draft.food.hours}</p>
          </>
        ) : <p>Choose an approved SIXPM dinner pick to continue.</p>}
      </section>
      {actionMessage && <p className="ios-action-message" role="alert">{actionMessage}</p>}
      <div className="ios-detail-actions ios-draft-review-actions">
        <button type="button" className="ios-primary-button" disabled={!canSave} onClick={onSave}>Save this evening</button>
        <button type="button" className="ios-secondary-button" onClick={onChoose}>{canSave ? 'Change a choice' : 'Keep choosing'}</button>
        <button type="button" className="ios-text-button" onClick={onClear}>Clear evening</button>
      </div>
    </main>
  )
}

function locationLabel(location) {
  if (location.state === 'granted' && location.location) return 'Nearby picks enabled'
  if (location.state === 'granted') return 'Ready when you ask'
  if (location.state === 'denied') return 'Not allowed'
  if (location.state === 'checking') return 'Checking…'
  return nativeAdapter.isNativeIos ? 'Off until you ask' : 'Available in iPhone app'
}

function Settings({ catalog, status, onRefresh, network, location, onUseLocation }) {
  const cinema = catalog.feeds.cinema
  const isConnected = network.connected
  const catalogLabel = status === 'refreshing'
    ? 'Refreshing…'
    : status === 'offline'
      ? 'Offline snapshot'
      : 'Verified'
  const catalogDescription = status === 'offline'
    ? 'Showing the last verified catalog still within its approved provider windows.'
    : `AMC showtimes updated ${formatCatalogTime(cinema.generatedAt)}.`
  const hasNearbyPicks = location.state === 'granted' && location.location
  return (
    <main className="ios-page">
      <header className="ios-page-header">
        <p className="ios-eyebrow">SIXPM / APP NOTES</p>
        <h1>Keep it<br />simple.</h1>
        <DecoRule compact />
      </header>
      <section className="ios-settings-card">
        <span>Catalog status</span>
        <strong>{catalogLabel}</strong>
        <p>{catalogDescription}</p>
        <button type="button" className="ios-secondary-button" onClick={() => onRefresh()} disabled={status === 'refreshing'}>
          Refresh catalog
        </button>
      </section>
      <section className="ios-settings-list" aria-label="App details">
        <div><span>Connection</span><strong>{isConnected ? 'Online' : 'Offline saved evenings only'}</strong></div>
        <div><span>Location</span><strong>{locationLabel(location)}</strong></div>
        <div><span>Calendar and reminders</span><strong>Used only when you save an evening</strong></div>
        <div><span>United States</span><strong>iPhone V1</strong></div>
      </section>
      {nativeAdapter.isNativeIos && (
        <section className="ios-settings-action">
          {location.state === 'denied' ? (
            <p>Location is off. SIXPM has not stored or sent it. Enable it in iPhone Settings only if you want dinner picks sorted by distance.</p>
          ) : (
            <>
              <p>{hasNearbyPicks
                ? 'Dinner picks are sorted nearest first for this session. SIXPM does not store or transmit your location.'
                : 'Location is never collected on launch or stored by SIXPM. Ask once to sort approved dinner picks by distance.'}</p>
              <button type="button" className="ios-secondary-button" onClick={onUseLocation}>
                {hasNearbyPicks ? 'Update my location' : 'Use my location'}
              </button>
            </>
          )}
        </section>
      )}
    </main>
  )
}

function Detail({ selection, onBack, draft, onAddToEvening }) {
  const isCinema = selection.type === 'cinema'
  const item = selection.item
  const cinema = isCinema ? item.primary : null
  const directions = isCinema ? directionsForCinema(cinema) : directionsForRestaurant(item)
  const primaryLink = isCinema ? cinema.link : directions
  const alreadySelected = isCinema ? draft.cinema?.id === cinema.id : draft.food?.id === item.id
  const addLabel = isCinema ? 'Add film to evening' : 'Add dinner to evening'

  return (
    <main className="ios-page ios-detail-page">
      <button type="button" className="ios-back-button" onClick={onBack}>← Return to catalog</button>
      <p className="ios-eyebrow">{isCinema ? 'AMC / CURRENT SHOWTIME' : 'SIXPM / DINNER NOTE'}</p>
      <h1>{isCinema ? item.title : item.name}</h1>
      <DecoRule compact />
      <div className="ios-detail-meta">
        {isCinema ? (
          <>
            <span>{readableDate(cinema.date)} · {formatScreeningTime(cinema.time)}</span>
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
              {readableDate(showing.date)} · {formatScreeningTime(showing.time)} · {showing.theaterShortName} · {showing.format || 'Standard'}
            </ExternalLink>
          ))}
        </section>
      )}
      <div className="ios-detail-actions">
        <button
          type="button"
          className="ios-primary-button"
          disabled={alreadySelected}
          onClick={() => onAddToEvening(isCinema ? 'cinema' : 'food', isCinema ? cinema : item)}
        >
          {alreadySelected ? `${isCinema ? 'Film' : 'Dinner'} held` : addLabel}
        </button>
        <ExternalLink href={primaryLink} className="ios-link-button">
          {isCinema ? 'AMC showtimes' : 'Get directions'}
        </ExternalLink>
        {isCinema && <ExternalLink href={directions}>Get directions</ExternalLink>}
      </div>
      <aside className="ios-detail-boundary">
        Save this pair while the verified catalog is current. SIXPM removes provider details when their freshness window ends.
      </aside>
    </main>
  )
}

export default function IosApp() {
  const { catalog, status, error, refresh } = useIosCatalog()
  const saved = useSavedEvenings()
  const [activeTab, setActiveTab] = useState('tonight')
  const [browseMode, setBrowseMode] = useState('film')
  const [selection, setSelection] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [actionMessage, setActionMessage] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [location, setLocation] = useState({ state: 'checking' })
  const network = useNetworkStatus()
  const selectedSavedEvening = selection?.type === 'saved'
    ? saved.evenings.find(evening => evening.id === selection.id) || null
    : null

  useEffect(() => {
    let active = true
    nativeAdapter.getLocationPermission().then(next => {
      if (active) setLocation(next)
    }).catch(() => {
      if (active) setLocation({ state: 'unavailable' })
    })
    return () => {
      active = false
    }
  }, [])

  const openBrowse = (mode) => {
    setBrowseMode(mode)
    setActiveTab('browse')
    setSelection(null)
  }

  const openSaved = () => {
    setActionMessage(null)
    setDeleting(false)
    setActiveTab('saved')
    setSelection(null)
  }

  const selectCatalogItem = (nextSelection) => {
    setActionMessage(null)
    setDeleting(false)
    setSelection(nextSelection)
  }

  const reviewDraft = () => {
    if (!draft.cinema || !draft.food) return
    setActionMessage(null)
    setDeleting(false)
    setSelection({ type: 'draft' })
  }

  const chooseRemainingDraftItem = () => {
    openBrowse(draft.cinema ? 'food' : 'film')
  }

  const clearDraft = () => {
    setDraft(emptyDraft())
    setActionMessage(null)
    if (selection?.type === 'draft') setSelection(null)
  }

  const addToDraft = (type, item) => {
    const nextDraft = { ...draft, [type]: item }
    setDraft(nextDraft)
    setActionMessage(null)
    setDeleting(false)
    if (nextDraft.cinema && nextDraft.food) {
      setSelection({ type: 'draft' })
      return
    }
    openBrowse(type === 'cinema' ? 'food' : 'film')
  }

  const saveDraft = async () => {
    if (!catalog) return
    try {
      const evening = await saved.saveDraft({ cinema: draft.cinema, food: draft.food, catalog })
      if (!evening) throw new Error('SIXPM could not save this evening.')
      setDraft(emptyDraft())
      setActiveTab('saved')
      setActionMessage('Saved on this iPhone. Add a Calendar event or local reminder whenever you’re ready.')
      setSelection({ type: 'saved', id: evening.id })
    } catch (nextError) {
      setActionMessage(nextError.message || 'SIXPM could not save this evening.')
    }
  }

  const useLocation = async () => {
    try {
      const result = await nativeAdapter.requestCurrentLocation()
      setLocation({
        state: result.status,
        ...(result.location ? { location: result.location } : {}),
      })
    } catch {
      setLocation({ state: 'unavailable' })
    }
  }

  const openDirections = async (url) => {
    try {
      const result = await nativeAdapter.openExternal(url)
      if (result.status !== 'opened') setActionMessage('Directions are available in the iPhone app when a secure browser is available.')
    } catch (nextError) {
      setActionMessage(nextError.message || 'Could not open directions.')
    }
  }

  const addCalendar = async (evening) => {
    try {
      const result = await nativeAdapter.addCalendarEvent(calendarEventForSavedEvening(evening))
      if (result.status === 'saved') {
        await saved.setCalendar(evening.id, {
          addedAt: new Date().toISOString(),
          eventId: result.eventId || null,
        })
        setActionMessage('Calendar event added. SIXPM will never change it without you.')
      } else if (result.status === 'cancelled') {
        setActionMessage('Calendar was not changed.')
      } else if (result.status === 'denied') {
        setActionMessage('Calendar access is off. You can enable it in iPhone Settings and try again.')
      } else {
        setActionMessage(result.message || 'Calendar is unavailable right now.')
      }
    } catch (nextError) {
      setActionMessage(nextError.message || 'Could not add the Calendar event.')
    }
  }

  const scheduleReminder = async (evening) => {
    try {
      const occupiedIds = saved.evenings
        .map(item => item.reminder?.notificationId)
        .filter(Number.isSafeInteger)
      const notificationId = notificationIdForSavedEvening(evening.id, occupiedIds)
      const reminder = reminderForSavedEvening(evening, notificationId)
      const result = await nativeAdapter.scheduleLocalReminder(reminder)
      if (result.status === 'scheduled') {
        await saved.setReminder(evening.id, {
          notificationId: result.id,
          at: reminder.at.toISOString(),
          scheduledAt: new Date().toISOString(),
        })
        setActionMessage('A local reminder is set for 90 minutes before the showing.')
      } else if (result.status === 'denied') {
        setActionMessage('Notifications are off. You can enable them in iPhone Settings and try again.')
      } else if (result.status === 'expired') {
        setActionMessage('This evening starts too soon for the default reminder.')
      } else {
        setActionMessage(result.message || 'Local reminders are unavailable right now.')
      }
    } catch (nextError) {
      setActionMessage(nextError.message || 'Could not schedule the reminder.')
    }
  }

  const cancelNativeReminder = async (evening) => {
    if (!evening.reminder?.notificationId) return
    const result = await nativeAdapter.cancelLocalReminder(evening.reminder.notificationId)
    if (result.status !== 'cancelled') {
      throw new Error(result.message || 'The local reminder could not be removed.')
    }
  }

  const removeReminder = async (evening) => {
    try {
      await cancelNativeReminder(evening)
      await saved.setReminder(evening.id, null)
      setActionMessage('The local reminder was removed.')
    } catch (nextError) {
      setActionMessage(nextError.message || 'Could not remove the reminder.')
    }
  }

  const shareEvening = async (evening) => {
    try {
      const result = await nativeAdapter.shareContent(shareContentForSavedEvening(evening))
      if (result.status === 'shared') {
        setActionMessage('Share sheet opened.')
      } else {
        setActionMessage('Sharing is unavailable right now.')
      }
    } catch (nextError) {
      setActionMessage(nextError.message || 'Could not share this evening.')
    }
  }

  const completeEvening = async (evening) => {
    try {
      await cancelNativeReminder(evening)
      await saved.complete(evening.id)
      setActionMessage('Marked complete. The plan stays on this iPhone until you delete it.')
    } catch (nextError) {
      setActionMessage(nextError.message || 'Could not complete this evening.')
    }
  }

  const deleteEvening = async (evening) => {
    if (!deleting) {
      setDeleting(true)
      return
    }
    try {
      await cancelNativeReminder(evening)
      await saved.remove(evening.id)
      setActionMessage(null)
      setDeleting(false)
      setSelection(null)
    } catch (nextError) {
      setActionMessage(nextError.message || 'Could not delete this saved evening.')
    }
  }

  const renderSaved = () => {
    if (selectedSavedEvening) {
      return (
        <SavedEveningDetail
          evening={selectedSavedEvening}
          onBack={() => {
            setActionMessage(null)
            setDeleting(false)
            setSelection(null)
          }}
          onCinemaDirections={() => openDirections(directionsForCinema(selectedSavedEvening.cinema))}
          onFoodDirections={() => openDirections(directionsForRestaurant(selectedSavedEvening.food))}
          onCalendar={() => addCalendar(selectedSavedEvening)}
          onReminder={() => scheduleReminder(selectedSavedEvening)}
          onRemoveReminder={() => removeReminder(selectedSavedEvening)}
          onShare={() => shareEvening(selectedSavedEvening)}
          onComplete={() => completeEvening(selectedSavedEvening)}
          onDelete={() => deleteEvening(selectedSavedEvening)}
          actionMessage={actionMessage}
          deleting={deleting}
          onCancelDelete={() => setDeleting(false)}
        />
      )
    }
    return (
      <SavedEvenings
        evenings={saved.evenings}
        status={saved.status}
        error={saved.error}
        onSelect={evening => {
          setActionMessage(null)
          setDeleting(false)
          setSelection({ type: 'saved', id: evening.id })
        }}
      />
    )
  }

  if (!catalog && activeTab !== 'saved') {
    return <CatalogState status={status} error={error} onRetry={refresh} savedCount={saved.evenings.length} onOpenSaved={openSaved} />
  }

  const content = !catalog
    ? renderSaved()
    : selection?.type === 'saved'
      ? renderSaved()
      : selection?.type === 'draft'
        ? <EveningDraftReview
            draft={draft}
            onBack={() => setSelection(null)}
            onSave={saveDraft}
            onChoose={chooseRemainingDraftItem}
            onClear={clearDraft}
            actionMessage={actionMessage}
          />
        : selection
          ? <Detail selection={selection} onBack={() => setSelection(null)} draft={draft} onAddToEvening={addToDraft} />
          : activeTab === 'tonight'
            ? <Tonight
                catalog={catalog}
                catalogStatus={status}
                location={location.location}
                onSelect={selectCatalogItem}
                onBrowse={openBrowse}
                draft={draft}
                onReviewDraft={reviewDraft}
                onChooseDraft={chooseRemainingDraftItem}
                onClearDraft={clearDraft}
              />
            : activeTab === 'browse'
              ? <Browse
                  catalog={catalog}
                  catalogStatus={status}
                  location={location.location}
                  onSelect={selectCatalogItem}
                  browseMode={browseMode}
                  onChangeMode={setBrowseMode}
                  draft={draft}
                  onReviewDraft={reviewDraft}
                  onChooseDraft={chooseRemainingDraftItem}
                  onClearDraft={clearDraft}
                />
              : activeTab === 'saved'
                ? renderSaved()
                : <Settings
                    catalog={catalog}
                    status={status}
                    onRefresh={refresh}
                    network={network}
                    location={location}
                    onUseLocation={useLocation}
                  />

  return (
    <div className="ios-app">
      {content}
      {!selection && (
        <nav className="ios-tab-bar" aria-label="SIXPM field index">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'active' : ''}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => {
                setActionMessage(null)
                setDeleting(false)
                setSelection(null)
                setActiveTab(tab.id)
              }}
            >
              <span className="ios-tab-index" aria-hidden="true">{tab.index}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
