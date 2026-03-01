import './FormatFilter.css'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'film', label: 'Film' },
  { key: 'IMAX', label: 'IMAX' },
]

function FormatFilter({ current, onChange }) {
  return (
    <div className="format-filter-bar">
      {FILTERS.map(f => (
        <button
          key={f.key}
          className={`format-chip ${current === f.key ? 'active' : ''}`}
          onClick={() => onChange(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

export default FormatFilter
