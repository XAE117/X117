import './Footer.css'

function Footer({ lastUpdated, isJazz }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'recently'
    const d = new Date(dateStr)
    if (isNaN(d)) return 'recently'
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
          Updated {formatDate(lastUpdated)}
        </span>
      </div>
      {isJazz && (
        <div className="footer-jazz-note">
          Underground shows update frequently. Follow{' '}
          <a href="https://www.instagram.com/minaretrecords/" target="_blank" rel="noopener noreferrer">
            @minaretrecords
          </a>{' '}
          on Instagram for the latest.
        </div>
      )}
    </footer>
  )
}

export default Footer
