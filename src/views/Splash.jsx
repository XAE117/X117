import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './Splash.css'

function Star({ style }) {
  return <div className="splash-star" style={style} />
}

function Splash({ onEnter }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)
  const containerRef = useRef(null)

  // useState lazy initializer is the blessed escape hatch for impure setup
  // (react-hooks/purity bans Math.random in render and useMemo bodies).
  const [stars] = useState(() =>
    Array.from({ length: 80 }, (_, i) => ({
      key: i,
      style: {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${1.5 + Math.random() * 3}px`,
        height: `${1.5 + Math.random() * 3}px`,
        animationDelay: `${Math.random() * 4}s`,
        animationDuration: `${2 + Math.random() * 3}s`,
      },
    }))
  )

  const [shootingStars] = useState(() =>
    Array.from({ length: 3 }, (_, i) => ({
      key: i,
      style: {
        top: `${10 + Math.random() * 40}%`,
        left: `${Math.random() * 60}%`,
        animationDelay: `${1 + i * 2.5}s`,
      },
    }))
  )

  const handleEnter = () => {
    setFading(true)
    sessionStorage.setItem('palace-splash-seen', '1')
    if (onEnter) onEnter()
    setTimeout(() => {
      setVisible(false)
      navigate('/', { replace: true })
    }, 800)
  }

  // Check if user has seen splash before this session
  useEffect(() => {
    try {
      const seen = sessionStorage.getItem('palace-splash-seen')
      if (seen) {
        setVisible(false)
        navigate('/', { replace: true })
      }
    } catch {
      // sessionStorage unavailable — skip splash
      setVisible(false)
      navigate('/', { replace: true })
    }
  }, [navigate])


  if (!visible) return null

  return (
    <div
      ref={containerRef}
      className={`splash-container ${fading ? 'fading' : ''}`}
      onClick={handleEnter}
    >
      <div className="splash-stars">
        {stars.map(s => <Star key={s.key} style={s.style} />)}
      </div>

      <div className="splash-shooting-stars">
        {shootingStars.map(s => (
          <div key={s.key} className="splash-shooting-star" style={s.style} />
        ))}
      </div>

      <div className="splash-content">
        <h1 className="splash-title">
          <span className="splash-title-line1">six</span>
          <span className="splash-title-line2">pm</span>
        </h1>
        <div className="splash-sparkle-row">
          <span className="splash-sparkle">✦</span>
          <span className="splash-sparkle">✦</span>
          <span className="splash-sparkle">✦</span>
        </div>
        <p className="splash-subtitle">Film · Jazz · Food</p>
        <p className="splash-enter">tap to enter</p>
      </div>

      <div className="splash-glow-orb" />
    </div>
  )
}

export default Splash
