import { useState, useEffect, useRef } from 'react'
import './Splash.css'

function Star({ style }) {
  return <div className="splash-star" style={style} />
}

function useTypewriter() {
  const [display, setDisplay] = useState('')
  const [phase, setPhase] = useState(0) // 0=waiting 1=typing1 2=deleting 3=typing2 4=done

  useEffect(() => {
    let cancelled = false
    const sleep = (ms) => new Promise(r => setTimeout(r, ms))

    async function run() {
      const phrase1 = 'what are we gonna do ton'
      const phrase2 = 'indecision solved'

      await sleep(1700)
      if (cancelled) return
      setPhase(1)

      for (let i = 1; i <= phrase1.length; i++) {
        if (cancelled) return
        setDisplay(phrase1.slice(0, i))
        await sleep(72)
      }

      await sleep(380)
      if (cancelled) return
      setPhase(2)

      for (let i = phrase1.length - 1; i >= 0; i--) {
        if (cancelled) return
        setDisplay(phrase1.slice(0, i))
        await sleep(30)
      }

      await sleep(140)
      if (cancelled) return
      setPhase(3)

      for (let i = 1; i <= phrase2.length; i++) {
        if (cancelled) return
        setDisplay(phrase2.slice(0, i))
        await sleep(55)
      }

      if (!cancelled) setPhase(4)
    }

    run()
    return () => { cancelled = true }
  }, [])

  return { display, phase }
}

function Splash({ onEnter }) {
  const [visible, setVisible] = useState(true)
  const [waiting, setWaiting] = useState(false)
  const [fading, setFading] = useState(false)
  const containerRef = useRef(null)
  const { display, phase } = useTypewriter()

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
    if (waiting) return
    setWaiting(true)
    sessionStorage.setItem('sixpm-splash-seen', '1')
    if (onEnter) onEnter()
    // Start fade immediately — the text cross-fades on its own
    setTimeout(() => setFading(true), 400)
    setTimeout(() => setVisible(false), 1800)
  }

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
        <h1 className="splash-title">sixpm</h1>
        <div className="splash-typewriter">
          <span className={`splash-typed-text ${phase >= 3 ? 'phase-slogan' : ''} ${phase === 4 ? 'done' : ''}`}>
            {display}
          </span>
          {phase > 0 && phase < 4 && <span className="splash-cursor">|</span>}
        </div>
        <p className="splash-subtitle">Film · Jazz · Food</p>
        <div className="splash-enter-wrap">
          <p className={`splash-enter ${waiting ? 'splash-enter-out' : ''}`}>
            tap to enter
          </p>
          <p className={`splash-enter splash-waiting-text ${waiting ? 'splash-enter-in' : ''}`}>
            please wait&hellip;
          </p>
        </div>
      </div>

      <div className="splash-glow-orb" />
    </div>
  )
}

export default Splash
