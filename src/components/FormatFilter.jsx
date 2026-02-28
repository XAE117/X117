import './FormatFilter.css'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'film', label: 'Film' },
  { key: '35mm', label: '35mm' },
  { key: '70mm', label: '70mm' },
  { key: '16mm', label: '16mm' },
  { key: 'nitrate', label: 'Nitrate' },
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
