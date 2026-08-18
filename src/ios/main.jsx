import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/josefin-sans/latin-400.css'
import '@fontsource/josefin-sans/latin-600.css'
import '@fontsource/source-serif-4/latin-400.css'
import '@fontsource/source-serif-4/latin-600.css'
import IosApp from './IosApp.jsx'
import './ios.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <IosApp />
  </StrictMode>,
)
