import TheaterMonthGroup from './TheaterMonthGroup.jsx'

export default function TheaterCard({ theater, isExpanded, onToggle, monthGroups, now, data, forceUpdate, formatDate, allScreenings }) {
  return (
    <div className={`theater-card ${isExpanded ? 'expanded' : ''}`}>
      <div
        className="theater-card-header"
        onClick={() => onToggle(theater.id)}
        style={{ borderLeftColor: theater.color }}
      >
        <div className="theater-info">
          <h2 className="theater-name">{theater.name}</h2>
          <span className="theater-neighborhood">{theater.neighborhood}</span>
        </div>
        <div className="theater-meta">
          <span className="screening-count">{theater.screenings.length} screenings</span>
          <span className={`expand-arrow ${isExpanded ? 'open' : ''}`}>&#9662;</span>
        </div>
      </div>

      {isExpanded && (
        <div className="theater-screenings">
          {Object.entries(monthGroups).map(([month, screenings]) => (
            <TheaterMonthGroup
              key={month}
              month={month}
              screenings={screenings}
              theater={theater}
              now={now}
              data={data}
              forceUpdate={forceUpdate}
              formatDate={formatDate}
              allScreenings={allScreenings}
            />
          ))}
        </div>
      )}
    </div>
  )
}
