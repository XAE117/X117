import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './BackPill.css'

function BackPill() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleBack = () => {
    if (loading) return
    setLoading(true)
    // Small delay so the loading screen is visible before navigation
    setTimeout(() => navigate(-1), 50)
  }

  return (
    <>
      {loading && (
        <div className="back-loading-overlay">
          <p className="back-loading-text">loading</p>
        </div>
      )}
      <button className="back-pill" onClick={handleBack} aria-label="Go back">
        <span className="back-pill-arrow">←</span>
        <span className="back-pill-label">back</span>
      </button>
    </>
  )
}

export default BackPill
