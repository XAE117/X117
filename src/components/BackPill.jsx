import { useNavigate } from 'react-router-dom'
import './BackPill.css'

function BackPill() {
  const navigate = useNavigate()
  return (
    <button className="back-pill" onClick={() => navigate(-1)} aria-label="Go back">
      <span className="back-pill-arrow">←</span>
      <span className="back-pill-label">back</span>
    </button>
  )
}

export default BackPill
