import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const routerBase = import.meta.env.BASE_URL === '/'
  ? undefined
  : import.meta.env.BASE_URL.replace(/\/$/, '')

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ color: '#E88A82', padding: '2rem', textAlign: 'center', fontFamily: 'monospace', background: '#0D0B0A', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', color: '#B8B0A0', maxWidth: '600px' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { sessionStorage.clear(); window.location.reload() }}
            style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem', background: 'none', border: '1px solid #C9A84C', color: '#C9A84C', borderRadius: '999px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <BrowserRouter basename={routerBase}>
        <App />
      </BrowserRouter>
    </RootErrorBoundary>
  </StrictMode>,
)
