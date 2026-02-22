import './LoadingSpinner.css'

function LoadingSpinner() {
  return (
    <div className="loading-container">
      <svg className="film-reel" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" stroke="#C9A84C" strokeWidth="2" />
        <circle cx="50" cy="50" r="35" stroke="#C9A84C" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="8" fill="#C9A84C" />
        <circle cx="50" cy="50" r="4" fill="#0D0B0A" />
        {/* Sprocket holes */}
        <circle cx="50" cy="10" r="4" fill="#C9A84C" className="sprocket" />
        <circle cx="84.5" cy="30" r="4" fill="#C9A84C" className="sprocket" />
        <circle cx="84.5" cy="70" r="4" fill="#C9A84C" className="sprocket" />
        <circle cx="50" cy="90" r="4" fill="#C9A84C" className="sprocket" />
        <circle cx="15.5" cy="70" r="4" fill="#C9A84C" className="sprocket" />
        <circle cx="15.5" cy="30" r="4" fill="#C9A84C" className="sprocket" />
      </svg>
      <p className="loading-text">Loading screenings...</p>
    </div>
  )
}

export default LoadingSpinner
