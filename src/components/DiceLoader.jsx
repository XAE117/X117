import { useState, useEffect } from 'react'
import './DiceLoader.css'

const PHRASES = [
  "Scanning tonight's showtimes...",
  "Cross-referencing open kitchens...",
  "Checking who's on stage...",
  "Optimizing your evening...",
  "Curating the perfect night out...",
  "Pulling strings at the door...",
  "Assembling the lineup...",
]

function DiceLoader({ onComplete, minDuration = 1500 }) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex(i => (i + 1) % PHRASES.length)
    }, 400)

    const timer = setTimeout(() => {
      setSettled(true)
      clearInterval(interval)
      setTimeout(onComplete, 500) // brief pause after dice settle
    }, minDuration)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [minDuration, onComplete])

  return (
    <div className="dice-loader">
      <div className={`dice-container ${settled ? 'settled' : ''}`}>
        <div className="dice dice-1">
          <div className="dice-face">
            <span className="dice-dot" />
            <span className="dice-dot" />
            <span className="dice-dot" />
            <span className="dice-dot" />
            <span className="dice-dot" />
          </div>
        </div>
        <div className="dice dice-2">
          <div className="dice-face">
            <span className="dice-dot" />
            <span className="dice-dot" />
            <span className="dice-dot" />
          </div>
        </div>
      </div>
      {settled && <div className="dice-sparks" />}
      <div className="dice-phrase" key={phraseIndex}>
        {PHRASES[phraseIndex]}
      </div>
    </div>
  )
}

export default DiceLoader
