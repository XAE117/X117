import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MorningConsole from './MorningConsole.jsx'
import './morning-console.css'

createRoot(document.getElementById('morning-root')).render(
  <StrictMode>
    <MorningConsole />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
