import './Header.css'

function Header({ mode }) {
  const subtitle = mode === 'jazz'
    ? 'Los Angeles Jazz Clubs & Live Music'
    : 'Los Angeles Repertory & Arthouse Cinema'

  return (
    <header className={`sixpm-header ${mode === 'jazz' ? 'jazz-mode' : ''}`}>
      <div className="header-deco-line" />
      <h1 className="sixpm-title">SIXPM</h1>
      <p className="sixpm-subtitle">{subtitle}</p>
      <div className="header-deco-line" />
    </header>
  )
}

export default Header
