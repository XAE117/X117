import { useState, useRef, useEffect } from 'react'
import './GuideRestaurantCard.css'

function GuideRestaurantCard({ restaurant, children }) {
  const [open, setOpen] = useState(false)
  const cardRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  useEffect(() => {
    if (!open || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    if (rect.right > window.innerWidth - 16) {
      cardRef.current.style.left = 'auto'
      cardRef.current.style.right = '0'
    }
    if (rect.left < 16) {
      cardRef.current.style.left = '0'
      cardRef.current.style.right = 'auto'
    }
  }, [open])

  if (!restaurant) return <span>{children}</span>

  const priceLabel = { '$': 'Street', '$$': 'Midrange', '$$$': 'Upscale', '$$$$': 'Fine Dining' }

  return (
    <span className="guide-restaurant-trigger-wrap">
      <span
        ref={triggerRef}
        className="guide-restaurant-name"
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(!open)}
      >
        {children}
      </span>
      {open && (
        <span className="guide-restaurant-card" ref={cardRef}>
          <span className="guide-card-header">
            <span className="guide-card-name">{restaurant.name}</span>
            <span className="guide-card-price">{restaurant.priceRange}</span>
          </span>
          <span className="guide-card-neighborhood">{restaurant.neighborhood}</span>
          {restaurant.notableFor && (
            <span className="guide-card-note">{restaurant.notableFor}</span>
          )}
          <span className="guide-card-links">
            {restaurant.googleMapsUrl && (
              <a href={restaurant.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="guide-card-link">
                Directions ↗
              </a>
            )}
            {restaurant.websiteUrl && (
              <a href={restaurant.websiteUrl} target="_blank" rel="noopener noreferrer" className="guide-card-link">
                Website ↗
              </a>
            )}
          </span>
        </span>
      )}
    </span>
  )
}

export default GuideRestaurantCard
