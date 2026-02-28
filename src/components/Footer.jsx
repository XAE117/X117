import './Footer.css'

function Footer({ lastUpdated, theaters }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <footer className="palace-footer">
      <div className="footer-inner">
        <span className="footer-updated">
          Updated {formatDate(lastUpdated)} &middot; Data from{' '}
          <a href="https://www.revivalhouses.com" target="_blank" rel="noopener noreferrer" className="footer-theater-link">
            Revival Houses
          </a>
        </span>
        <div className="footer-theaters">
          {theaters.map((t, i) => (
            <span key={t.id}>
              <a href={t.url} target="_blank" rel="noopener noreferrer" className="footer-theater-link">
                {t.shortName}
              </a>
              {i < theaters.length - 1 && <span className="footer-sep">&middot;</span>}
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default Footer
