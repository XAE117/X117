import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import IosApp from './IosApp.jsx'
import './ios.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <IosApp />
  </StrictMode>,
)
