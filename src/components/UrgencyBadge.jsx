import './UrgencyBadge.css'

function UrgencyBadge({ type, showLabel }) {
  if (!type) return null
  const label = type === 'last-screening' ? 'Last Screening' : 'Final Night'
  return (
    <span className="urgency-dot-wrap">
      <span className="urgency-dot" />
      {showLabel && <span className="urgency-dot-label">{label}</span>}
    </span>
  )
}

export default UrgencyBadge
