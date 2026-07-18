import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import './GuidePage.css'
import './JazzBioEssay.css'

function renderInlineMarkdown(text, keyPrefix) {
  return text
    .replace(/\[\^\d+\]/g, '')
    .split(/(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={key}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={key}>{part.slice(1, -1)}</em>
      }
      return part
    })
}

function renderContent(text) {
  if (!text) return null
  const blocks = text.split(/\n\n+/)
  return blocks.map((block, i) => {
    const trimmed = block.trim()
    if (!trimmed) return null

    // Scene break
    if (/^\*\s*\*\s*\*$/.test(trimmed)) {
      return <hr key={i} className="bio-scene-break" />
    }

    // Pull quote: block starting with >
    if (trimmed.startsWith('>')) {
      return (
        <p key={i} className="guide-pullquote">
          {renderInlineMarkdown(trimmed.replace(/^>\s*/, ''), `quote-${i}`)}
        </p>
      )
    }

    return <p key={i}>{renderInlineMarkdown(trimmed, `paragraph-${i}`)}</p>
  }).filter(Boolean)
}

function chapterLabel(ch) {
  if (ch.number === 0) return 'Prologue'
  if (ch.number === 13) return 'Epilogue'
  return `Chapter ${ch.number}`
}

function chapterDisplayTitle(ch) {
  const colonIdx = ch.title.indexOf(': ')
  return colonIdx !== -1 ? ch.title.slice(colonIdx + 2) : ch.title
}

function JazzBioEssay({ bioData }) {
  const [selectedId, setSelectedId] = useState(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [tocDesktopOpen, setTocDesktopOpen] = useState(false)

  const chapters = useMemo(() => bioData?.chapters || [], [bioData])
  const selectedIndex = Math.max(0, chapters.findIndex(chapter => chapter.id === selectedId))
  const selectedChapter = chapters[selectedIndex]

  const selectChapter = (id) => {
    setSelectedId(id)
    setTocOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!bioData) {
    return (
      <div className="guide-page">
        <article className="guide-article bio-loading">
          <p>Loading biography…</p>
        </article>
      </div>
    )
  }

  return (
    <div className="guide-page">
      <div className="guide-essay-back-wrap">
        <Link to="/jazz" className="guide-essay-back-btn">← Jazz</Link>
      </div>

      {/* Desktop TOC */}
      <nav className={`guide-toc-desktop ${tocDesktopOpen ? 'open' : 'collapsed'}`}>
        <button
          className="guide-toc-desktop-toggle"
          onClick={() => setTocDesktopOpen(!tocDesktopOpen)}
          aria-label={tocDesktopOpen ? 'Collapse chapters' : 'Expand chapters'}
        >
          <span className="guide-toc-desktop-toggle-icon">{tocDesktopOpen ? '−' : '+'}</span>
          <span className="guide-toc-desktop-toggle-label">Chapters</span>
        </button>
        {tocDesktopOpen && (
          <div className="guide-toc-desktop-items">
            {chapters.map(ch => (
              <button
                key={ch.id}
                className={`guide-toc-item ${selectedChapter?.id === ch.id ? 'active' : ''}`}
                onClick={() => selectChapter(ch.id)}
              >
                <span className="guide-toc-emoji">{ch.emoji}</span>
                <span className="guide-toc-text">{ch.shortTitle}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Mobile TOC */}
      <nav className={`guide-toc-mobile ${tocOpen ? 'open' : ''}`}>
        <button className="guide-toc-toggle" onClick={() => setTocOpen(!tocOpen)}>
          <span>Chapters</span>
          <span className={`guide-toc-arrow ${tocOpen ? 'open' : ''}`}>▾</span>
        </button>
        {tocOpen && (
          <div className="guide-toc-mobile-items">
            {chapters.map(ch => (
              <button
                key={ch.id}
                className={`guide-toc-item ${selectedChapter?.id === ch.id ? 'active' : ''}`}
                onClick={() => selectChapter(ch.id)}
              >
                <span className="guide-toc-emoji">{ch.emoji}</span>
                <span className="guide-toc-text">{ch.shortTitle}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <article className="guide-article">
        <header className="guide-hero">
          <p className="guide-kicker">SIXPM Feature · Full Biography</p>
          <h1 className="guide-title">{bioData.title}</h1>
          <p className="guide-subtitle">
            The story of how a drummer from the San Fernando Valley grabbed magic out of the boring air — and built a universe around it.
          </p>
          <div className="guide-byline">
            <span>14 Chapters</span>
            <span className="guide-byline-sep">·</span>
            <span>~73,000 Words</span>
            <span className="guide-byline-sep">·</span>
            <span>2026</span>
          </div>
        </header>

        <hr className="guide-divider" />

        {selectedChapter && (
          <div key={selectedChapter.id}>
            <section id={selectedChapter.id} className="guide-section bio-chapter">
              <div className="guide-section-marker">
                <span>{selectedChapter.emoji}</span>
              </div>
              <div className="bio-chapter-label">{chapterLabel(selectedChapter)}</div>
              <h2 className="guide-section-title">{chapterDisplayTitle(selectedChapter)}</h2>
              {renderContent(selectedChapter.content)}
            </section>
            <nav className="bio-chapter-pagination" aria-label="Biography chapters">
              {selectedIndex > 0 ? (
                <button type="button" onClick={() => selectChapter(chapters[selectedIndex - 1].id)}>
                  ← {chapters[selectedIndex - 1].shortTitle}
                </button>
              ) : <span />}
              {selectedIndex < chapters.length - 1 && (
                <button type="button" onClick={() => selectChapter(chapters[selectedIndex + 1].id)}>
                  {chapters[selectedIndex + 1].shortTitle} →
                </button>
              )}
            </nav>
          </div>
        )}

        <hr className="guide-divider guide-divider--final" />

        <footer className="guide-coda">
          <p>
            <em>Grabbing Magic Out of the Boring Air</em> is an unauthorized feature biography. Louis Cole performs in Los Angeles regularly — check the live listings for what's coming up next.
          </p>
          <p className="guide-updated">
            <Link to="/jazz" className="bio-coda-link">← Back to Jazz Listings</Link>
          </p>
        </footer>
      </article>
    </div>
  )
}

export default JazzBioEssay
