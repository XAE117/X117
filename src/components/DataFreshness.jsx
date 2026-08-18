import './DataFreshness.css'

function formatUpdated(value) {
  if (!value) return 'Update time unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Update time unavailable'
  return `Updated ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} at ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

export default function DataFreshness({ sources }) {
  const available = sources.filter(source => source.updated)
  if (available.length === 0) return null

  return (
    <div className="data-freshness" aria-label="Data freshness">
      {available.map(source => (
        <span key={source.label} className="data-freshness-item">
          <span className="data-freshness-dot" aria-hidden="true" />
          {source.label}: {formatUpdated(source.updated)}
        </span>
      ))}
    </div>
  )
}
