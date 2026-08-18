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

function EveningDraftBanner({ draft, onReview, onChoose, onClear }) {
  const hasCinema = Boolean(draft.cinema)
  const hasFood = Boolean(draft.food)
  if (!hasCinema && !hasFood) return null

  const complete = hasCinema && hasFood
  const nextLabel = hasCinema ? 'Choose dinner' : 'Choose a film'
  return (
    <aside className="ios-draft-banner" aria-label="Evening in progress">
      <div>
        <p className="ios-eyebrow">EVENING IN PROGRESS</p>
        <strong>{complete ? 'Your film and dinner are ready to save.' : `One choice held. ${nextLabel}.`}</strong>
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

function Tonight({ catalog, onSelect, onBrowse, draft, onReviewDraft, onChooseDraft, onClearDraft }) {
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

      <EveningDraftBanner draft={draft} onReview={onReviewDraft} onChoose={onChooseDraft} onClear={onClearDraft} />

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

function Browse({ catalog, onSelect, browseMode, onChangeMode, draft, onReviewDraft, onChooseDraft, onClearDraft }) {
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
      <EveningDraftBanner draft={draft} onReview={onReviewDraft} onChoose={onChooseDraft} onClear={onClearDraft} />
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

function EveningDraftReview({ draft, onBack, onSave, onChoose, onClear, actionMessage }) {
  const canSave = Boolean(draft.cinema && draft.food)
  return (
    <main className="ios-page ios-detail-page">
      <button type="button" className="ios-back-button" onClick={onBack}>‹ Back</button>
      <p className="ios-eyebrow">YOUR EVENING</p>
      <h1>One good plan.</h1>
      <p className="ios-draft-intro">SIXPM stores this pair only on this iPhone, and removes provider details after their approved freshness windows end.</p>
      <section className="ios-saved-detail-block">
        <h2>Film</h2>
        {draft.cinema ? (
          <>
            <p>{draft.cinema.title}</p>
            <p>{readableDate(draft.cinema.date)} · {draft.cinema.time} · {draft.cinema.theaterShortName}</p>
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
  return (
    <main className="ios-page">
      <header className="ios-page-header">
        <p className="ios-eyebrow">NO ACCOUNT. NO ADS.</p>
        <h1>Settings</h1>
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
      {nativeAdapter.isNativeIos && location.state !== 'granted' && (
        <section className="ios-settings-action">
          <p>Location is never collected on launch or stored by SIXPM. It is requested only for an explicit nearby-picks action.</p>
          <button type="button" className="ios-secondary-button" onClick={onUseLocation}>
            Use my location
          </button>
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
        <button
          type="button"
          className="ios-primary-button"
          disabled={alreadySelected}
          onClick={() => onAddToEvening(isCinema ? 'cinema' : 'food', isCinema ? cinema : item)}
        >
          {alreadySelected ? `${isCinema ? 'Film' : 'Dinner'} selected` : addLabel}
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
      setLocation({ state: result.status })
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
        <nav className="ios-tab-bar" aria-label="Main navigation">
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
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
