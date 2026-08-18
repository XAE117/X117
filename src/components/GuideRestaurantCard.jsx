import { useState, useRef, useEffect, useId } from 'react'
import { createAppleMapsUrl } from '../utils/directions.js'
import './GuideRestaurantCard.css'

function GuideRestaurantCard({ restaurant, children }) {
  const [open, setOpen] = useState(false)
  const cardRef = useRef(null)
  const triggerRef = useRef(null)
  const cardId = useId()

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
    if (!open) return
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
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
  const directionsUrl = restaurant.directionsUrl || createAppleMapsUrl(restaurant)

  return (
    <span className="guide-restaurant-trigger-wrap">
      <button
        type="button"
        ref={triggerRef}
        className="guide-restaurant-name"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls={cardId}
      >
        {children}
      </button>
      {open && (
        <span id={cardId} className="guide-restaurant-card" ref={cardRef} role="region" aria-label={`${restaurant.name} details`}>
          <span className="guide-card-header">
            <span className="guide-card-name">{restaurant.name}</span>
            <span className="guide-card-price">{restaurant.priceRange}</span>
          </span>
          <span className="guide-card-neighborhood">{restaurant.neighborhood}</span>
          {restaurant.notableFor && (
            <span className="guide-card-note">{restaurant.notableFor}</span>
          )}
          <span className="guide-card-links">
            {directionsUrl && (
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="guide-card-link">
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
