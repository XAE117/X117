import { Link } from 'react-router-dom'
import './LegalPages.css'

const SUPPORT_URL = 'https://github.com/XAE117/X117/issues/new'

const PAGE_META = {
  privacy: {
    eyebrow: 'SIXPM / PRIVACY',
    title: 'Your evening stays yours.',
    intro: 'Effective August 18, 2026. SIXPM is a free, account-free Los Angeles evening guide. It has no ads, analytics SDKs, tracking pixels, subscriptions, or in-app purchases.',
  },
  terms: {
    eyebrow: 'SIXPM / TERMS',
    title: 'Use the guide. Make the call.',
    intro: 'Effective August 18, 2026. These terms describe the limited, informational use of SIXPM V1.',
  },
  support: {
    eyebrow: 'SIXPM / SUPPORT',
    title: 'A clear way back in.',
    intro: 'SIXPM support is handled in the public project issue tracker. Do not include private information, account credentials, or precise location in a public issue.',
  },
  credits: {
    eyebrow: 'SIXPM / CREDITS',
    title: 'Sources, with limits.',
    intro: 'SIXPM V1 shows only the sources and fields that are cleared for its iPhone catalog. A source appearing here is not permission to use it beyond the documented scope.',
  },
}

function Section({ id, title, children }) {
  return (
    <section className="legal-section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Privacy() {
  return (
    <>
      <Section title="What stays on this iPhone">
        <p>Saved evenings, the reminder and Calendar status for a saved evening, and a verified offline catalog snapshot are stored locally through iPhone Preferences. SIXPM does not create an account or sync this information to a SIXPM server.</p>
        <p>If a provider freshness window ends, SIXPM redacts that provider’s details from the saved evening and removes an invalid or expired offline catalog snapshot.</p>
      </Section>
      <Section title="Location, Calendar, reminders, and sharing">
        <p>Location is requested only after you press the nearby-picks action. It is used in memory to sort the approved dinner picks by distance for that session; it is not stored or transmitted by SIXPM.</p>
        <p>Calendar opens the iPhone system event editor only when you choose Add to Calendar. Local reminders are created only when you choose a reminder. Sharing opens the iPhone share sheet only when you choose Share. SIXPM does not read your Calendar, contacts, share recipients, or notification history.</p>
      </Section>
      <Section title="Catalog and external links">
        <p>The app makes an unauthenticated HTTPS request to SIXPM’s Vercel-hosted versioned catalog to retrieve approved AMC showtimes and owner-authored dinner records. Vercel may process routine request metadata, including IP address, device/browser information, and country or city derived from an IP address, as described in its <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noopener noreferrer">Privacy Notice</a>. SIXPM does not use that information for advertising, profiling, or cross-app tracking.</p>
        <p>When you open AMC or Apple Maps links, their privacy practices apply. SIXPM does not embed a third-party map or send an API key with the app.</p>
      </Section>
      <Section id="delete-local-data" title="Delete local data">
        <p>Delete an individual saved evening from its detail screen. To erase saved evenings and the verified offline catalog while keeping the app, open App Notes and choose On-device data. You can also delete the SIXPM app in iOS Settings or from the Home Screen; iOS removes this app’s local container. Calendar events you chose to add remain under your control in Calendar.</p>
      </Section>
      <Section title="Changes and questions">
        <p>Material policy changes will appear on this page with a new effective date. For a question or deletion help, use the <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">SIXPM support tracker</a>.</p>
      </Section>
    </>
  )
}

function Terms() {
  return (
    <>
      <Section title="Informational guide only">
        <p>SIXPM helps you discover currently listed entertainment and dinner options. It does not sell tickets, make reservations, guarantee availability, or operate any venue. Confirm showtimes, addresses, accessibility details, prices, hours, and entry requirements directly with the provider before you go.</p>
      </Section>
      <Section title="Your choices stay yours">
        <p>You choose whether to save an evening, create a Calendar event, create a local reminder, open directions, or share a plan. You are responsible for your plans, travel, purchases, safety, and compliance with venue rules.</p>
      </Section>
      <Section title="Source limits">
        <p>AMC showtime information is displayed only within the approved catalog boundary and may change. SIXPM dinner notes are a small first-party editorial set, not a recommendation guarantee. Provider names, marks, and linked destinations belong to their respective owners.</p>
      </Section>
      <Section title="Availability and changes">
        <p>SIXPM may update, pause, or remove a feature or catalog source when data is stale, rights are unresolved, or the product changes. The app is provided as available, without a promise that a particular listing will remain current.</p>
      </Section>
      <Section title="Questions">
        <p>For a question about these terms, use the <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">SIXPM support tracker</a>.</p>
      </Section>
    </>
  )
}

function Support() {
  return (
    <>
      <Section title="Get help">
        <p>Open a <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">SIXPM support issue</a> with your iPhone model, iOS version, app version, and a short description of what happened. Please leave out personal information, tickets, payment details, passwords, or precise location.</p>
      </Section>
      <Section title="Common fixes">
        <p>If the catalog is unavailable, check your connection and try Refresh. The app will use a verified offline catalog only while its approved source windows remain current. Saved evenings remain available on the Saved screen, with expired provider details removed.</p>
        <p>For location, Calendar, or reminders, SIXPM never repeatedly asks after a denial. Re-enable the permission in iPhone Settings only if you want to use that feature again.</p>
      </Section>
      <Section title="Delete app data">
        <p>Delete a saved evening from its detail screen. To erase saved evenings and the verified offline catalog while keeping SIXPM installed, open App Notes and choose On-device data. You can also delete the app in iOS Settings or from the Home Screen. Calendar events and reminder settings you already created remain under your control in their Apple apps.</p>
      </Section>
    </>
  )
}

function Credits() {
  return (
    <>
      <Section title="Catalog attribution">
        <p><strong>Showtimes supplied by AMC Theatres.</strong> SIXPM V1 includes only approved AMC theatre identity and showtime fields, with a limited freshness window. Ticketing and provider terms remain with AMC.</p>
        <p><strong>Curated by SIXPM.</strong> The dinner notebook contains owner-authored, rights-cleared editorial records only. It does not include the legacy scraped guide, Google Places content, TMDB enrichment, Jazz listings, or embedded map data.</p>
      </Section>
      <Section title="Technology and type">
        <p>SIXPM uses React, Vite, and Capacitor under their MIT licenses. Source Serif 4 and Josefin Sans are included locally through Fontsource under the SIL Open Font License 1.1.</p>
      </Section>
      <Section title="Full boundary">
        <p>Read the current <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms of Use</Link> for the data and provider limits that govern this release.</p>
      </Section>
    </>
  )
}

function PageContent({ page }) {
  if (page === 'privacy') return <Privacy />
  if (page === 'terms') return <Terms />
  if (page === 'support') return <Support />
  return <Credits />
}

export default function LegalPage({ page }) {
  const meta = PAGE_META[page]
  return (
    <div className="legal-page-shell">
      <main className="legal-page" id="main-content">
        <header className="legal-header">
          <Link className="legal-brand" to="/" aria-label="Return to SIXPM home">SIXPM</Link>
          <p>{meta.eyebrow}</p>
          <h1>{meta.title}</h1>
          <div className="legal-rule" aria-hidden="true">◆</div>
          <p className="legal-intro">{meta.intro}</p>
        </header>
        <PageContent page={page} />
        <nav className="legal-nav" aria-label="Legal and support pages">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/support">Support</Link>
          <Link to="/credits">Credits</Link>
        </nav>
      </main>
    </div>
  )
}
