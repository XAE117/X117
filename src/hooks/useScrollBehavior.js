import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useScrollBehavior() {
  const [isScrolling, setIsScrolling] = useState(false)
  const location = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Scroll detection: fade pills out when scrolling, back in after idle
  useEffect(() => {
    let scrollTimer
    const handleScroll = () => {
      setIsScrolling(true)
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => setIsScrolling(false), 200)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimer)
    }
  }, [])

  return { isScrolling }
}
