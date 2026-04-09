import './UrgencyBadge.css'

function UrgencyBadge({ type }) {
  if (!type) return null
  const label = type === 'last-screening' ? 'LAST SCREENING' : 'FINAL NIGHT'
  return <span className="urgency-badge">{label}</span>
}

export default UrgencyBadge
