import './DecoDivider.css'

function DecoDivider({ variant = 'sunburst' }) {
  if (variant === 'fan') {
    return (
      <div className="deco-divider deco-fan" aria-hidden="true">
        <svg viewBox="0 0 120 20" preserveAspectRatio="xMidYMid meet">
          <line x1="0" y1="10" x2="35" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <line x1="85" y1="10" x2="120" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          {[...Array(7)].map((_, i) => {
            const angle = -45 + i * 15
            const rad = (angle * Math.PI) / 180
            const len = 8 + Math.abs(3 - i) * -0.5
            const x2 = 60 + Math.sin(rad) * (len + 2)
            const y2 = 12 - Math.cos(rad) * (len + 2)
            return (
              <line
                key={i}
                x1="60"
                y1="14"
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={i === 3 ? '0.8' : '0.5'}
                opacity={i === 3 ? 0.6 : 0.3}
              />
            )
          })}
          <circle cx="60" cy="14" r="1" fill="currentColor" opacity="0.4" />
        </svg>
      </div>
    )
  }

  return (
    <div className="deco-divider deco-sunburst" aria-hidden="true">
      <svg viewBox="0 0 200 16" preserveAspectRatio="xMidYMid meet">
        <line x1="0" y1="8" x2="70" y2="8" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        <line x1="130" y1="8" x2="200" y2="8" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        <g transform="translate(100, 8)">
          {[...Array(5)].map((_, i) => {
            const angle = -40 + i * 20
            const rad = (angle * Math.PI) / 180
            const len = i === 2 ? 7 : 5
            return (
              <line
                key={i}
                x1={0}
                y1={0}
                x2={Math.sin(rad) * len}
                y2={-Math.cos(rad) * len}
                stroke="currentColor"
                strokeWidth={i === 2 ? '0.7' : '0.4'}
                opacity={i === 2 ? 0.5 : 0.25}
              />
            )
          })}
          <circle r="1.2" fill="currentColor" opacity="0.35" />
        </g>
      </svg>
    </div>
  )
}

export default DecoDivider
