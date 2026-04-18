import { Link } from 'react-router-dom'
import './GuideHub.css'

function GuideHub() {
  return (
    <div className="guide-hub">
      <header className="guide-hub-hero">
        <p className="guide-hub-kicker">SIXPM Presents</p>
        <h1 className="guide-hub-title">The Field Guides</h1>
        <p className="guide-hub-subtitle">
          Long-form dispatches from LA's obsessions. Deep research, strong opinions, essential restaurants.
        </p>
      </header>

      <div className="guide-hub-cards">
        <Link to="/guide/tacos" className="guide-hub-card guide-hub-card--tacos">
          <span className="guide-hub-card-emoji">🌮</span>
          <div className="guide-hub-card-body">
            <h2 className="guide-hub-card-title">The Corn & Fire Companion</h2>
            <p className="guide-hub-card-desc">
              The nixtamal revolution, the trompo masters, the underground pits.
              Why LA is the greatest taco city on earth.
            </p>
            <span className="guide-hub-card-cta">Read the Essay →</span>
          </div>
        </Link>

        <Link to="/guide/pizza" className="guide-hub-card guide-hub-card--pizza">
          <span className="guide-hub-card-emoji">🍕</span>
          <div className="guide-hub-card-body">
            <h2 className="guide-hub-card-title">The Pizza Index</h2>
            <p className="guide-hub-card-desc">
              Tokyo-Neapolitan hybrids, sourdough fermentation labs, Detroit frico edges.
              LA's pizza moment, by style.
            </p>
            <span className="guide-hub-card-cta">Read the Essay →</span>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default GuideHub
