import { useEffect, useMemo, useRef, useState } from 'react'
import { SavedEveningDetail, SavedEvenings } from './SavedEveningViews.jsx'
import { clearOfflineCatalogSnapshot } from './offlineCatalog.js'
import { eraseSIXPMOnDeviceData } from './onDeviceData.js'
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
  upcomingScreenings,
} from './format.js'

const TABS = [
  { id: 'tonight', label: 'Tonight', index: '01' },
  { id: 'browse', label: 'Catalog', index: '02' },
  { id: 'saved', label: 'Saved', index: '03' },
  { id: 'settings', label: 'Notes', index: '04' },
]

const emptyDraft = () => ({ cinema: null, food: null })

const IOS_LEGAL_NOTES = Object.freeze({
  privacy: {
    eyebrow: 'SIXPM / PRIVACY',
    title: 'Your evening stays yours.',
    sections: [
      ['On this iPhone', 'Saved evenings, a verified offline catalog snapshot, and related Calendar/reminder status are stored locally. SIXPM has no account, ads, analytics SDKs, tracking pixels, subscription, or in-app purchase.'],
      ['Your choices', 'Location is requested only when you ask for nearby picks and is used only in memory. Calendar, reminders, sharing, and external links open only after you choose their action. SIXPM does not read your Calendar, contacts, share recipients, or notification history.'],
      ['Catalog and deletion', 'The app fetches a rights-gated catalog over HTTPS from Vercel. Vercel may process routine request metadata under its Privacy Notice; SIXPM does not use it for advertising, profiling, or cross-app tracking. You can erase saved evenings and the offline catalog in App Notes. Calendar events you chose to add remain in Calendar under your control.'],
    ],
    href: 'https://sixpm.vercel.app/privacy',
    linkLabel: 'Open full Privacy Policy',
  },
  terms: {
    eyebrow: 'SIXPM / TERMS',
    title: 'Use the guide. Make the call.',
    sections: [
      ['Informational only', 'SIXPM helps you discover current entertainment and dinner options. It does not sell tickets, make reservations, guarantee availability, or operate any venue. Confirm details directly with the provider before you go.'],
      ['Your choices', 'You control saved evenings, Calendar, reminders, directions, sharing, travel, purchases, and venue decisions. Showtimes and provider details can change.'],
      ['Source limits', 'AMC showtimes are shown only inside the approved catalog boundary. The dinner notebook is a small first-party editorial set, not a guarantee or a complete city guide.'],
    ],
    href: 'https://sixpm.vercel.app/terms',
    linkLabel: 'Open full Terms',
  },
  support: {
    eyebrow: 'SIXPM / SUPPORT',
    title: 'A clear way back in.',
    sections: [
      ['Get help', 'Use the public support tracker with your iPhone model, iOS version, app version, and a short description. Do not include passwords, payment details, tickets, or precise location in a public issue.'],
      ['A catalog is unavailable', 'Check your connection and try Refresh. SIXPM shows an offline catalog only while its approved provider windows remain current; saved plans remain on this iPhone with expired provider details removed.'],
      ['Permissions', 'SIXPM respects a denied permission and never repeatedly asks. Re-enable Location, Calendar, or Notifications in iPhone Settings only if you want that feature again.'],
    ],
    href: 'https://github.com/XAE117/X117/issues/new',
    linkLabel: 'Open support tracker',
  },
  credits: {
    eyebrow: 'SIXPM / CREDITS',
    title: 'Sources, with limits.',
    sections: [
      ['Catalog attribution', 'Showtimes supplied by AMC Theatres. The dinner notebook is curated by SIXPM from owner-authored, rights-cleared records only.'],
      ['Excluded from V1', 'No TMDB enrichment or imagery, Google Places or Maps content, scraped restaurant editorial, Jazz listings, embedded maps, accounts, ads, or tracking SDKs are included.'],
      ['Technology and type', 'SIXPM uses React, Vite, and Capacitor. Source Serif 4 and Josefin Sans are bundled locally through Fontsource under the SIL Open Font License 1.1.'],
    ],
    href: 'https://sixpm.vercel.app/credits',
    linkLabel: 'Open full credits',
  },
})

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

function LegalNote({ page, onBack }) {
  const note = IOS_LEGAL_NOTES[page] || IOS_LEGAL_NOTES.privacy
  return (
    <main className="ios-page ios-detail-page ios-legal-page" data-ios-screen tabIndex={-1}>
      <button type="button" className="ios-back-button" onClick={onBack}>← Return to app notes</button>
      <p className="ios-eyebrow">{note.eyebrow}</p>
      <h1>{note.title}</h1>
      <DecoRule compact />
      <div className="ios-legal-sections">
        {note.sections.map(([heading, copy]) => (
          <section key={heading} className="ios-saved-detail-block">
            <h2>{heading}</h2>
            <p>{copy}</p>
          </section>
        ))}
      </div>
      <ExternalLink href={note.href} className="ios-secondary-button">{note.linkLabel}</ExternalLink>
    </main>
  )
}

function CatalogState({ status, onRetry, savedCount, onOpenSaved, onOpenNotes }) {
  const savedLabel = `Open ${savedCount} saved evening${savedCount === 1 ? '' : 's'}`
  if (status === 'loading') {
    return (
      <main className="ios-status-screen" data-ios-screen tabIndex={-1} aria-live="polite">
        <span className="ios-status-mark" aria-hidden="true">◐</span>
        <h1>Finding tonight.</h1>
        <p>Verifying the current SIXPM catalog.</p>
        {savedCount > 0 && <button type="button" className="ios-secondary-button" onClick={onOpenSaved}>{savedLabel}</button>}
        <button type="button" className="ios-text-button" onClick={onOpenNotes}>App notes</button>
      </main>
    )
  }

  return (
    <main className="ios-status-screen" data-ios-screen tabIndex={-1} aria-live="assertive" aria-atomic="true">
      <span className="ios-status-mark ios-status-mark-error" aria-hidden="true">!</span>
      <h1>Catalog unavailable.</h1>
      <p>SIXPM could not verify a current catalog. Check your connection and try again.</p>
      <button type="button" className="ios-primary-button" onClick={() => onRetry()}>
        Try again
      </button>
      {savedCount > 0 && <button type="button" className="ios-secondary-button" onClick={onOpenSaved}>{savedLabel}</button>}
      <button type="button" className="ios-text-button" onClick={onOpenNotes}>App notes</button>
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

function SectionHeader({ eyebrow, title, action, headingId }) {
  return (
    <div className="ios-section-heading">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h2 id={headingId}>{title}</h2>
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

function Tonight({ catalog, catalogStatus, location, now, onSelect, onBrowse, draft, onReviewDraft, onChooseDraft, onClearDraft }) {
  const cinema = useMemo(() => groupScreeningsByTitle(
    tonightOrNextScreenings(catalog.feeds.cinema, now),
  ).slice(0, 3), [catalog, now])
  const food = useMemo(() => sortRestaurantsByDistance(
    catalog.feeds.food.data.restaurants || [],
    location,
  ), [catalog, location])
  const cinemaTitle = cinema.length > 0 && cinema[0].primary.date !== localDateKey(now)
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
    <main className="ios-page ios-tonight-page" data-ios-screen tabIndex={-1}>
      <header className="ios-hero">
        <p className="ios-hero-kicker">THE LOS ANGELES EVENING GUIDE</p>
        <h1>SIXPM</h1>
        <p className="ios-hero-date">{dispatchDate}</p>
        <DecoRule />
        <p className="ios-hero-caption">A current cinema listing and a small dinner notebook for the part of Los Angeles that begins after work.</p>
      </header>

      <OfflineCatalogNotice status={catalogStatus} />

      <EveningDraftBanner draft={draft} onReview={onReviewDraft} onChoose={onChooseDraft} onClear={onClearDraft} />

      <section className="ios-section ios-tonight-film-section" aria-labelledby="ios-film-heading">
        <SectionHeader headingId="ios-film-heading" eyebrow="AMC / TONIGHT'S PROGRAM" title={cinemaTitle} action={<button type="button" className="ios-text-button" onClick={() => onBrowse('film')}>Browse all</button>} />
        <p className="ios-directory-note">Choose a verified showing, then add dinner from its listing.</p>
        <div className="ios-listing-stack">
          {cinema.length > 0
            ? cinema.map(movie => <MovieCard key={movie.id} movie={movie} onSelect={onSelect} />)
            : <p className="ios-empty-copy">No verified upcoming AMC showtimes are available yet.</p>}
        </div>
      </section>

      <section className="ios-section" aria-labelledby="ios-food-heading">
        <SectionHeader headingId="ios-food-heading" eyebrow={foodEyebrow} title={foodTitle} action={<button type="button" className="ios-text-button" onClick={() => onBrowse('food')}>See all</button>} />
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

function Browse({ catalog, catalogStatus, location, now, onSelect, browseMode, onChangeMode, draft, onReviewDraft, onChooseDraft, onClearDraft }) {
  const cinema = useMemo(() => groupScreeningsByTitle(
    upcomingScreenings(catalog.feeds.cinema, now),
  ), [catalog, now])
  const food = useMemo(() => sortRestaurantsByDistance(
    catalog.feeds.food.data.restaurants || [],
    location,
  ), [catalog, location])
  const items = browseMode === 'film' ? cinema : food
  const directoryTitle = browseMode === 'film' ? <>Film<br />directory</> : <>Dinner<br />notebook</>

  return (
    <main className="ios-page" data-ios-screen tabIndex={-1}>
      <header className="ios-page-header">
        <p className="ios-eyebrow">LOS ANGELES · CURRENT EDITION</p>
        <h1>{directoryTitle}</h1>
        <DecoRule compact />
      </header>
      <OfflineCatalogNotice status={catalogStatus} />
      <EveningDraftBanner draft={draft} onReview={onReviewDraft} onChoose={onChooseDraft} onClear={onClearDraft} />
      <div className="ios-segmented-control" role="group" aria-label="Catalog type">
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
    <main className="ios-page ios-detail-page" data-ios-screen tabIndex={-1}>
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

function Settings({
  catalog,
  status,
  onRefresh,
  network,
  location,
  locationMessage,
  onUseLocation,
  textScale,
  onOpenLegal,
  dataDeletionArmed,
  dataDeletionPending,
  dataDeletionMessage,
  onBeginDataDeletion,
  onCancelDataDeletion,
  onConfirmDataDeletion,
}) {
  const cinema = catalog?.feeds?.cinema
  const isConnected = network.connected
  const catalogLabel = status === 'refreshing'
    ? 'Refreshing…'
    : status === 'offline'
      ? 'Offline snapshot'
      : cinema
        ? 'Verified'
        : 'Unavailable'
  const catalogDescription = status === 'offline'
    ? 'Showing the last verified catalog still within its approved provider windows.'
    : cinema
      ? `AMC showtimes updated ${formatCatalogTime(cinema.generatedAt)}.`
      : 'No verified catalog is available. Saved evenings and app notes remain on this iPhone.'
  const hasNearbyPicks = location.state === 'granted' && location.location
  return (
    <main className="ios-page" data-ios-screen tabIndex={-1}>
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
        <div><span>Text size</span><strong>{textScale.source === 'ios' ? 'Follows iPhone' : 'Standard preview'}</strong></div>
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
          {locationMessage && <p className="ios-action-message" role="status">{locationMessage}</p>}
        </section>
      )}
      <section className="ios-settings-action ios-policy-card" aria-labelledby="ios-policy-heading">
        <h2 id="ios-policy-heading">Policies + support</h2>
        <p>Read the app’s local privacy summary, terms, source credits, or support guidance. The complete public pages are available when you choose to open them.</p>
        <div className="ios-policy-index">
          {[
            ['privacy', 'Privacy'],
            ['terms', 'Terms'],
            ['support', 'Support'],
            ['credits', 'Credits'],
          ].map(([page, label], index) => (
            <button type="button" key={page} onClick={() => onOpenLegal(page)}>
              <span aria-hidden="true">0{index + 1}</span>{label}
            </button>
          ))}
        </div>
      </section>
      <section className="ios-settings-action ios-data-controls" aria-labelledby="ios-data-heading">
        <h2 id="ios-data-heading">On-device data</h2>
        {!dataDeletionArmed ? (
          <>
            <p>Erase saved evenings and the verified offline catalog from this iPhone. Any Calendar event you chose to add remains in Calendar.</p>
            <button type="button" className="ios-danger-button" onClick={onBeginDataDeletion} disabled={dataDeletionPending}>Erase on-device data</button>
          </>
        ) : (
          <div className="ios-delete-confirmation" role="alert" aria-busy={dataDeletionPending || undefined}>
            <p>Erase every saved evening and the offline catalog from this iPhone? This cannot be undone. Calendar events remain in Calendar.</p>
            <div>
              <button type="button" className="ios-secondary-button" onClick={onCancelDataDeletion} disabled={dataDeletionPending}>Keep data</button>
              <button type="button" className="ios-danger-button" onClick={onConfirmDataDeletion} disabled={dataDeletionPending}>{dataDeletionPending ? 'Erasing…' : 'Erase permanently'}</button>
            </div>
          </div>
        )}
        {dataDeletionMessage && <p className="ios-action-message" role="status">{dataDeletionMessage}</p>}
      </section>
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
    <main className="ios-page ios-detail-page" data-ios-screen tabIndex={-1}>
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
      <aside className="ios-detail-boundary">
        Save this pair while the verified catalog is current. SIXPM removes provider details when their freshness window ends.
      </aside>
    </main>
  )
}

export default function IosApp() {
  const { catalog, status, refresh } = useIosCatalog()
  const saved = useSavedEvenings()
  const [activeTab, setActiveTab] = useState('tonight')
  const [browseMode, setBrowseMode] = useState('film')
  const [selection, setSelection] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [actionMessage, setActionMessage] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [dataDeletionArmed, setDataDeletionArmed] = useState(false)
  const [dataDeletionPending, setDataDeletionPending] = useState(false)
  const [dataDeletionMessage, setDataDeletionMessage] = useState(null)
  const [location, setLocation] = useState({ state: 'checking' })
  const [locationMessage, setLocationMessage] = useState(null)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [textScale, setTextScale] = useState({ category: 'UICTContentSizeCategoryL', scale: 1, source: 'default' })
  const contentRef = useRef(null)
  const lastRouteRef = useRef(null)
  const network = useNetworkStatus()
  const selectedSavedEvening = selection?.type === 'saved'
    ? saved.evenings.find(evening => evening.id === selection.id) || null
    : null

  useEffect(() => {
    const refreshCurrentTime = () => setCurrentTime(new Date())
    const interval = window.setInterval(refreshCurrentTime, 60_000)
    const refreshOnForeground = () => {
      if (document.visibilityState === 'visible') refreshCurrentTime()
    }
    document.addEventListener('visibilitychange', refreshOnForeground)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshOnForeground)
    }
  }, [])

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

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}
    Promise.resolve().then(async () => {
      const next = await nativeAdapter.getTextScale()
      if (active) setTextScale(next)
      const nextUnsubscribe = await nativeAdapter.subscribeTextScale(nextScale => {
        if (active) setTextScale(nextScale)
      })
      if (!active) {
        await Promise.resolve(nextUnsubscribe()).catch(() => {})
        return
      }
      unsubscribe = nextUnsubscribe
    }).catch(() => {
      if (active) setTextScale({ category: 'UICTContentSizeCategoryL', scale: 1, source: 'default' })
    })
    return () => {
      active = false
      void Promise.resolve(unsubscribe()).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!nativeAdapter.isNativeIos || typeof document === 'undefined') return undefined
    const root = document.documentElement
    const previousFontSize = root.style.fontSize
    root.style.fontSize = `${(16 * textScale.scale).toFixed(2)}px`
    return () => {
      root.style.fontSize = previousFontSize
    }
  }, [textScale.scale])

  const openBrowse = (mode) => {
    setBrowseMode(mode)
    setActiveTab('browse')
    setSelection(null)
    setLocationMessage(null)
    setDataDeletionArmed(false)
  }

  const openSaved = () => {
    setActionMessage(null)
    setDeleting(false)
    setActiveTab('saved')
    setSelection(null)
    setLocationMessage(null)
    setDataDeletionArmed(false)
  }

  const openSettings = () => {
    setActionMessage(null)
    setDeleting(false)
    setDataDeletionArmed(false)
    setDataDeletionMessage(null)
    setLocationMessage(null)
    setSelection(null)
    setActiveTab('settings')
  }

  const openLegalNote = (page) => {
    setActionMessage(null)
    setDeleting(false)
    setDataDeletionArmed(false)
    setDataDeletionMessage(null)
    setActiveTab('settings')
    setSelection({ type: 'legal', page })
  }

  const beginDataDeletion = () => {
    if (dataDeletionPending) return
    setDataDeletionArmed(true)
    setDataDeletionMessage(null)
  }

  const cancelDataDeletion = () => {
    if (dataDeletionPending) return
    setDataDeletionArmed(false)
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
      const nextLocation = {
        state: result.status,
        ...(result.location ? { location: result.location } : {}),
      }
      setLocation(nextLocation)
      if (result.status === 'granted') {
        setLocationMessage('Dinner picks are now sorted by distance for this session. SIXPM does not retain or send your location.')
      } else if (result.status === 'denied') {
        setLocationMessage('Location remains off. Enable it in iPhone Settings only if you want nearby dinner picks.')
      } else {
        setLocationMessage(result.message || 'SIXPM could not use your location right now.')
      }
    } catch {
      setLocation({ state: 'unavailable' })
      setLocationMessage('SIXPM could not use your location right now.')
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

  const eraseOnDeviceData = async () => {
    if (!dataDeletionArmed || dataDeletionPending) return

    setDataDeletionPending(true)
    setDataDeletionMessage(null)
    setActionMessage(null)

    try {
      const result = await eraseSIXPMOnDeviceData({
        evenings: saved.evenings,
        cancelReminder: cancelNativeReminder,
        clearSavedEvenings: saved.clear,
        clearOfflineCatalog: clearOfflineCatalogSnapshot,
      })
      const fullyCleared = result.savedEveningsCleared && result.offlineCatalogCleared

      if (!fullyCleared) {
        setDataDeletionMessage('SIXPM could not confirm that every local item was erased. Try again before deleting the app. Calendar events are never changed.')
        return
      }

      setDraft(emptyDraft())
      if (result.unresolvedReminderCount > 0) {
        setDataDeletionMessage(`Saved evenings and the offline catalog were erased. ${result.unresolvedReminderCount} local reminder${result.unresolvedReminderCount === 1 ? '' : 's'} could not be confirmed as removed; check iPhone Settings if needed.`)
        return
      }
      setDataDeletionMessage('Saved evenings and the offline catalog were erased from this iPhone. Calendar events remain in Calendar.')
    } catch {
      setDataDeletionMessage('SIXPM could not confirm that every local item was erased. Try again before deleting the app. Calendar events are never changed.')
    } finally {
      setDataDeletionPending(false)
      setDataDeletionArmed(false)
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

  const appClassName = `ios-app${textScale.scale >= 1.24 ? ' ios-type-accessibility' : ''}`
  const routeKey = `${!catalog && activeTab !== 'saved' && activeTab !== 'settings' ? 'catalog-state' : 'catalog'}:${selection?.type === 'saved'
    ? `saved:${selection.id}`
    : selection?.type || activeTab}`

  useEffect(() => {
    if (lastRouteRef.current === null) {
      lastRouteRef.current = routeKey
      return undefined
    }
    if (lastRouteRef.current === routeKey) return undefined
    lastRouteRef.current = routeKey
    const timeout = setTimeout(() => {
      contentRef.current?.querySelector('[data-ios-screen]')?.focus({ preventScroll: true })
    }, 0)
    return () => clearTimeout(timeout)
  }, [routeKey])

  const settings = (
    <Settings
      catalog={catalog}
      status={status}
      onRefresh={refresh}
      network={network}
      location={location}
      locationMessage={locationMessage}
      onUseLocation={useLocation}
      textScale={textScale}
      onOpenLegal={openLegalNote}
      dataDeletionArmed={dataDeletionArmed}
      dataDeletionPending={dataDeletionPending}
      dataDeletionMessage={dataDeletionMessage}
      onBeginDataDeletion={beginDataDeletion}
      onCancelDataDeletion={cancelDataDeletion}
      onConfirmDataDeletion={eraseOnDeviceData}
    />
  )

  const content = selection?.type === 'legal'
    ? <LegalNote page={selection.page} onBack={() => setSelection(null)} />
    : !catalog
      ? activeTab === 'saved'
        ? renderSaved()
        : activeTab === 'settings'
          ? settings
          : <CatalogState
              status={status}
              onRetry={refresh}
              savedCount={saved.evenings.length}
              onOpenSaved={openSaved}
              onOpenNotes={openSettings}
            />
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
                now={currentTime}
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
                  now={currentTime}
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
                : settings

  return (
    <div ref={contentRef} className={appClassName}>
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
                if (tab.id === 'settings') {
                  openSettings()
                  return
                }
                setActionMessage(null)
                setDeleting(false)
                setDataDeletionArmed(false)
                setDataDeletionMessage(null)
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
