import { formatScreeningTime, readableDate } from './format.js'
import { savedEveningAvailability } from './savedEvenings.js'

function EveningTitle({ evening, availability }) {
  if (!availability.cinema) return <strong>Film details expired</strong>
  return <strong>{evening.cinema.title}</strong>
}

function EveningSummary({ evening, availability }) {
  if (!availability.cinema && !availability.food) {
    return <span className="ios-listing-details">Provider details are no longer retained.</span>
  }
  const cinema = availability.cinema
    ? `${readableDate(evening.cinema.date)} · ${formatScreeningTime(evening.cinema.time)}`
    : 'Film details expired'
  const food = availability.food ? evening.food.name : 'Dinner details expired'
  return <span className="ios-listing-details">{cinema} · {food}</span>
}

function SavedEveningCard({ evening, onSelect }) {
  const availability = savedEveningAvailability(evening)
  return (
    <button type="button" className="ios-listing ios-saved-listing" onClick={() => onSelect(evening)}>
      <span className="ios-listing-venue">{evening.status === 'completed' ? 'COMPLETED' : 'SAVED EVENING'}</span>
      <span className="ios-listing-copy">
        <EveningTitle evening={evening} availability={availability} />
        <EveningSummary evening={evening} availability={availability} />
      </span>
      <span className="ios-listing-when" aria-hidden="true">↗</span>
    </button>
  )
}

export function SavedEvenings({ evenings, status, error, onSelect }) {
  if (status === 'loading') {
    return (
      <main className="ios-page ios-empty-page" aria-live="polite">
        <span className="ios-empty-symbol" aria-hidden="true">◌</span>
        <p className="ios-eyebrow">LOCAL ARCHIVE</p>
        <h1>Loading saved evenings.</h1>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="ios-page ios-empty-page" role="alert">
        <span className="ios-empty-symbol" aria-hidden="true">!</span>
        <p className="ios-eyebrow">LOCAL ARCHIVE</p>
        <h1>Saved evenings unavailable.</h1>
        <p>{error?.message || 'SIXPM could not read this iPhone’s saved evenings.'}</p>
      </main>
    )
  }

  const planned = evenings.filter(evening => evening.status === 'planned')
  const completed = evenings.filter(evening => evening.status === 'completed')
  if (evenings.length === 0) {
    return (
      <main className="ios-page ios-empty-page">
        <span className="ios-empty-symbol" aria-hidden="true">♡</span>
        <p className="ios-eyebrow">LOCAL ARCHIVE</p>
        <h1>Nothing held yet.</h1>
        <p>Pair a verified AMC showing with an approved dinner pick. The plan will remain on this iPhone while its provider details are still current.</p>
      </main>
    )
  }

  return (
    <main className="ios-page">
      <header className="ios-page-header">
        <p className="ios-eyebrow">LOCAL ARCHIVE / THIS IPHONE</p>
        <h1>Saved<br />evenings</h1>
        <div className="ios-deco-rule compact" aria-hidden="true"><span>◆</span></div>
      </header>
      {planned.length > 0 && (
        <section className="ios-section ios-saved-section" aria-labelledby="ios-planned-heading">
          <h2 id="ios-planned-heading">Planned</h2>
          <div className="ios-listing-stack">
            {planned.map(evening => <SavedEveningCard key={evening.id} evening={evening} onSelect={onSelect} />)}
          </div>
        </section>
      )}
      {completed.length > 0 && (
        <section className="ios-section ios-saved-section" aria-labelledby="ios-completed-heading">
          <h2 id="ios-completed-heading">Completed</h2>
          <div className="ios-listing-stack">
            {completed.map(evening => <SavedEveningCard key={evening.id} evening={evening} onSelect={onSelect} />)}
          </div>
        </section>
      )}
    </main>
  )
}

export function SavedEveningDetail({
  evening,
  onBack,
  onCinemaDirections,
  onFoodDirections,
  onCalendar,
  onReminder,
  onRemoveReminder,
  onShare,
  onComplete,
  onDelete,
  actionMessage,
  deleting,
  onCancelDelete,
}) {
  const availability = savedEveningAvailability(evening)
  const canPlanActions = evening.status === 'planned' && availability.cinema

  return (
      <main className="ios-page ios-detail-page">
      <button type="button" className="ios-back-button" onClick={onBack}>← Return to saved evenings</button>
      <p className="ios-eyebrow">{evening.status === 'completed' ? 'COMPLETED EVENING' : 'SAVED EVENING'}</p>
      <h1>{availability.cinema ? evening.cinema.title : 'Saved evening'}</h1>
      <div className="ios-deco-rule compact" aria-hidden="true"><span>◆</span></div>
      {availability.cinema ? (
        <section className="ios-saved-detail-block">
          <h2>Film</h2>
          <p>{readableDate(evening.cinema.date)} · {formatScreeningTime(evening.cinema.time)} · {evening.cinema.format}</p>
          <p>{evening.cinema.theaterName} · {evening.cinema.theaterNeighborhood}</p>
          <button type="button" className="ios-secondary-button" onClick={onCinemaDirections}>Cinema directions</button>
        </section>
      ) : (
        <p className="ios-expired-note">The approved cinema snapshot has expired, so SIXPM no longer retains or displays it offline.</p>
      )}
      {availability.food ? (
        <section className="ios-saved-detail-block">
          <h2>Dinner</h2>
          <p>{evening.food.name} · {evening.food.cuisine}</p>
          <p>{evening.food.address}</p>
          <button type="button" className="ios-secondary-button" onClick={onFoodDirections}>Dinner directions</button>
        </section>
      ) : (
        <p className="ios-expired-note">The approved dinner snapshot has expired, so SIXPM no longer retains or displays it offline.</p>
      )}
      {actionMessage && <p className="ios-action-message" role="status">{actionMessage}</p>}
      <section className="ios-detail-actions ios-saved-actions" aria-label="Saved evening actions">
        {canPlanActions && !evening.calendar && <button type="button" className="ios-primary-button" onClick={onCalendar}>Add to Calendar</button>}
        {evening.calendar && <p className="ios-action-note">Calendar event added. It stays in Calendar if you delete this SIXPM plan.</p>}
        {canPlanActions && !evening.reminder && <button type="button" className="ios-secondary-button" onClick={onReminder}>Remind me 90 minutes before</button>}
        {evening.reminder && <button type="button" className="ios-secondary-button" onClick={onRemoveReminder}>Remove reminder</button>}
        <button type="button" className="ios-secondary-button" onClick={onShare}>Share evening</button>
        {evening.status === 'planned' && <button type="button" className="ios-secondary-button" onClick={onComplete}>Mark completed</button>}
      </section>
      {!deleting ? (
        <button type="button" className="ios-danger-button" onClick={onDelete}>Delete saved evening</button>
      ) : (
        <section className="ios-delete-confirmation" role="alert">
          <p>Delete this plan from this iPhone? A Calendar event already added remains under your control in Calendar.</p>
          <div>
            <button type="button" className="ios-secondary-button" onClick={onCancelDelete}>Keep evening</button>
            <button type="button" className="ios-danger-button" onClick={onDelete}>Delete permanently</button>
          </div>
        </section>
      )}
    </main>
  )
}
