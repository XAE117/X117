import AppShell from './components/AppShell.jsx'
import AppProviders from './context/AppProviders.jsx'
import './App.css'

function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  )
}

export default App
