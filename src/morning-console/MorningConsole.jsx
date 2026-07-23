import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BookOpenText,
  Brain,
  ChevronDown,
  CircleGauge,
  Clock3,
  ExternalLink,
  HeartPulse,
  MoonStar,
  RefreshCw,
  Settings2,
  Sparkles,
  Target,
  TimerReset,
  X,
} from 'lucide-react'

const CACHE_KEY = 'morning-console-brief-v2'
const SECRET_KEY = 'morning-console-secret'
const MOMENTUM_CACHE_KEY = 'morning-console-momentum-v1'
const MOMENTUM_ORIGIN = 'https://momentum-streaks.vercel.app'
const SIGNAL_DEFAULTS = {
  cognitiveActivation: 5,
  physiologicalCapacity: 5,
  creativeTemperature: 5,
  sleepHours: 7,
  pemRisk: 'green',
}

function readLocal(key, fallback = null) {
  try {
    const value = localStorage.getItem(key)
    return value == null ? fallback : value
  } catch {
    return fallback
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // The console remains usable when storage is disabled or full.
  }
}

function readCachedBrief() {
  const value = readLocal(CACHE_KEY)
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed?.generatedAt ? parsed : null
  } catch {
    return null
  }
}

function duration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

function relativeTime(value) {
  if (!value) return 'not yet'
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60_000))
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`
}

function statusLabel(status) {
  return status === 'live' ? 'LIVE' : 'OFFLINE'
}

function ProjectLock({ project, index }) {
  if (!project) return null
  const primary = index === 0

  return (
    <article className={primary ? 'project-lock primary-lock' : 'project-lock'}>
      <div className="project-rank" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
      <div className="project-copy">
        <p className="micro-label">{primary ? 'TODAY\'S LOCK' : 'ON DECK'}</p>
        <h2>{project.name}</h2>
        <p className="next-action">{project.nextAction}</p>
        <div className="project-meta">
          {project.progress != null && <span>{Math.round(project.progress)}% complete</span>}
          <span>money gravity {project.moneyGravity}</span>
          {project.deadline && <span>due {project.deadline}</span>}
        </div>
      </div>
      {project.notionUrl && (
        <a
          className="icon-link"
          href={project.notionUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${project.name} in Notion`}
          title="Open in Notion"
        >
          <ExternalLink size={17} />
        </a>
      )}
    </article>
  )
}

function SignalGauge({ icon, label, value, tone }) {
  const safeValue = Number.isFinite(value) ? value : null
  const fill = safeValue == null ? 0 : Math.max(0, Math.min(100, safeValue * 10))

  return (
    <div className={`signal-gauge ${tone}`}>
      <div className="gauge-heading">
        {createElement(icon, { size: 17 })}
        <span>{label}</span>
        <strong>{safeValue == null ? '—' : safeValue}</strong>
      </div>
      <div className="bar-track" aria-hidden="true">
        <span style={{ width: `${fill}%` }} />
      </div>
    </div>
  )
}

function ConnectorStrip({ connectors = [], momentum, momentumSummary }) {
  return (
    <div className="connector-strip" aria-label="Data connector status">
      {connectors.map((connector) => (
        <span className={`connector ${connector.status}`} key={connector.name} title={connector.error || ''}>
          <i />
          {connector.name.replace('notion-', '')} {statusLabel(connector.status)}
        </span>
      ))}
      <span
        className={`connector ${momentumSummary ? 'live' : 'device'}`}
        title={momentumSummary ? 'Read from Momentum Streaks on this device.' : momentum?.message || ''}
      >
        <i />
        momentum {momentumSummary ? 'LIVE' : 'DEVICE'}
      </span>
    </div>
  )
}

function SettingsPanel({ secret, setSecret, onClose }) {
  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button close-button" onClick={onClose} aria-label="Close settings" title="Close">
          <X size={18} />
        </button>
        <p className="micro-label">CONNECTION</p>
        <h2 id="settings-title">Console settings</h2>
        <label className="text-field">
          <span>Morning Console access key</span>
          <input
            type="password"
            autoComplete="current-password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
          />
        </label>
        <p className="boundary-note">
          The key stays in this browser. Notion and Toggl credentials remain on the server.
        </p>
        <div className="boundary-block">
          <strong>Interpretive boundaries</strong>
          <p>Coaching is reflective planning support, not therapy or medical care.</p>
          <p>Astrology and chaos magick are optional symbolic lenses, not evidence or decision authorities.</p>
        </div>
      </section>
    </div>
  )
}

function SignalEditor({ values, setValues, onSave, isSaving }) {
  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <details className="signal-editor">
      <summary>
        <span><CircleGauge size={17} /> Update body signals</span>
        <ChevronDown size={17} />
      </summary>
      <div className="signal-controls">
        {[
          ['cognitiveActivation', 'Cognitive activation'],
          ['physiologicalCapacity', 'Physical capacity'],
          ['creativeTemperature', 'Creative temperature'],
        ].map(([key, label]) => (
          <label className="range-field" key={key}>
            <span>{label}<strong>{values[key]}</strong></span>
            <input
              type="range"
              min="0"
              max="10"
              value={values[key]}
              onChange={(event) => update(key, Number(event.target.value))}
            />
          </label>
        ))}
        <label className="compact-input">
          <span>Sleep hours</span>
          <input
            type="number"
            min="0"
            max="16"
            step="0.25"
            value={values.sleepHours}
            onChange={(event) => update('sleepHours', Number(event.target.value))}
          />
        </label>
        <div className="pem-control" aria-label="PEM risk">
          <span>PEM risk</span>
          <div className="segmented">
            {['green', 'yellow', 'red'].map((risk) => (
              <button
                type="button"
                className={values.pemRisk === risk ? 'active' : ''}
                onClick={() => update('pemRisk', risk)}
                key={risk}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>
        <button className="secondary-button" type="button" onClick={onSave} disabled={isSaving}>
          {isSaving ? <RefreshCw size={16} className="spinning" /> : <HeartPulse size={16} />}
          {isSaving ? 'Saving' : 'Save signals'}
        </button>
      </div>
    </details>
  )
}

function EmptyConsole({ onOpenSettings }) {
  return (
    <main className="console-shell empty-shell">
      <section className="empty-state">
        <Sparkles size={28} />
        <p className="micro-label">MORNING CONSOLE</p>
        <h1>Connect the briefing feed.</h1>
        <p>Enter the private access key once. Refresh will then read the live sources available to this console.</p>
        <button className="primary-button" onClick={onOpenSettings}>
          <Settings2 size={17} />
          Open settings
        </button>
      </section>
    </main>
  )
}

export default function MorningConsole() {
  const [secret, setSecretState] = useState(() => readLocal(SECRET_KEY, ''))
  const [brief, setBrief] = useState(readCachedBrief)
  const [momentumSummary, setMomentumSummary] = useState(() => {
    const value = readLocal(MOMENTUM_CACHE_KEY)
    if (!value) return null
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  })
  const [bridgeNonce, setBridgeNonce] = useState(0)
  const [error, setError] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [signals, setSignals] = useState(SIGNAL_DEFAULTS)

  const setSecret = useCallback((value) => {
    setSecretState(value)
    writeLocal(SECRET_KEY, value)
  }, [])

  const refresh = useCallback(async () => {
    if (!secret) {
      setSettingsOpen(true)
      return
    }

    setIsRefreshing(true)
    setBridgeNonce((current) => current + 1)
    setError('')
    try {
      const response = await fetch('/api/morning-brief', {
        headers: { 'X-Morning-Secret': secret },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'The briefing feed did not respond.')
      }
      setBrief(payload)
      writeLocal(CACHE_KEY, JSON.stringify(payload))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsRefreshing(false)
    }
  }, [secret])

  useEffect(() => {
    if (secret && !brief) refresh()
  }, [brief, refresh, secret])

  useEffect(() => {
    function receiveMomentum(event) {
      if (
        event.origin !== MOMENTUM_ORIGIN ||
        event.data?.type !== 'momentum-streaks-summary' ||
        event.data?.version !== 1 ||
        !event.data?.summary?.generatedAt
      ) return

      setMomentumSummary(event.data.summary)
      writeLocal(MOMENTUM_CACHE_KEY, JSON.stringify(event.data.summary))
    }

    window.addEventListener('message', receiveMomentum)
    return () => window.removeEventListener('message', receiveMomentum)
  }, [])

  useEffect(() => {
    if (!brief?.body) return
    setSignals((current) => ({
      cognitiveActivation: brief.body.cognitiveActivation ?? current.cognitiveActivation,
      physiologicalCapacity: brief.body.physiologicalCapacity ?? current.physiologicalCapacity,
      creativeTemperature: brief.body.creativeTemperature ?? current.creativeTemperature,
      sleepHours: brief.body.sleepHours ?? current.sleepHours,
      pemRisk: brief.body.pemRisk || current.pemRisk,
    }))
  }, [brief])

  async function saveSignals() {
    if (!secret) {
      setSettingsOpen(true)
      return
    }
    setIsSaving(true)
    setError('')
    try {
      const response = await fetch('/api/body-signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Morning-Secret': secret,
        },
        body: JSON.stringify({
          cognitive_activation: signals.cognitiveActivation,
          physiological_capacity: signals.physiologicalCapacity,
          creative_temperature: signals.creativeTemperature,
          sleep_hours: signals.sleepHours,
          focus_mode: 'Daily briefing',
          active_projects: brief?.projects?.map((project) => project.name) || [],
          body_state: '',
          mood: '',
          pem_risk: signals.pemRisk,
          free_text: '',
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Signals were not saved.')
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const dateLabel = useMemo(() => new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date()), [])

  if (!brief && !secret) {
    return (
      <>
        <EmptyConsole onOpenSettings={() => setSettingsOpen(true)} />
        {settingsOpen && (
          <SettingsPanel
            secret={secret}
            setSecret={setSecret}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </>
    )
  }

  const body = brief?.body || {}
  const sky = brief?.astrology?.sky
  const source = brief?.astrology?.source

  return (
    <main className="console-shell">
      <iframe
        className="momentum-bridge"
        title="Momentum Streaks read-only bridge"
        sandbox="allow-scripts allow-same-origin"
        src={`${MOMENTUM_ORIGIN}/?bridge=morning-console&parentOrigin=${encodeURIComponent(window.location.origin)}&refresh=${bridgeNonce}`}
      />
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true"><Sparkles size={17} /></span>
          <div>
            <p className="micro-label">JAMES WALKER // DAILY OPERATIONS</p>
            <h1>Morning Console</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="date-readout">
            <span>{dateLabel}</span>
            <small>{brief ? `updated ${relativeTime(brief.generatedAt)}` : 'awaiting signal'}</small>
          </div>
          <button
            className="primary-button refresh-button"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={17} className={isRefreshing ? 'spinning' : ''} />
            {isRefreshing ? 'Reading signals' : 'Refresh'}
          </button>
          <button
            className="icon-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings2 size={19} />
          </button>
        </div>
      </header>

      {brief && (
        <ConnectorStrip
          connectors={brief.connectors}
          momentum={brief.momentum}
          momentumSummary={momentumSummary}
        />
      )}

      {error && (
        <div className="error-banner" role="alert">
          <Activity size={17} />
          <span>{error}</span>
          {brief && <small>Showing the last successful briefing.</small>}
        </div>
      )}

      {!brief ? (
        <section className="loading-state">
          <RefreshCw size={24} className="spinning" />
          <p>Reading the available systems…</p>
        </section>
      ) : (
        <>
          <section className="command-grid">
            <div className="project-stack">
              {brief.projects.length ? (
                brief.projects.map((project, index) => (
                  <ProjectLock project={project} index={index} key={project.id} />
                ))
              ) : (
                <div className="section-empty">Notion projects are unavailable. The cached console remains intact.</div>
              )}
            </div>

            <aside className="signal-column">
              <section className="signal-bank">
                <div className="section-heading">
                  <div>
                    <p className="micro-label">CAPACITY GATE</p>
                    <h2>Body before ambition</h2>
                  </div>
                  <HeartPulse size={21} />
                </div>
                <SignalGauge
                  icon={Brain}
                  label="Cognitive activation"
                  value={body.cognitiveActivation}
                  tone="cognitive"
                />
                <SignalGauge
                  icon={HeartPulse}
                  label="Physical capacity"
                  value={body.physiologicalCapacity}
                  tone="physical"
                />
                <SignalGauge
                  icon={Sparkles}
                  label="Creative temperature"
                  value={body.creativeTemperature}
                  tone="creative"
                />
                <div className="body-meta">
                  <span>{body.sleepHours != null ? `${body.sleepHours}h sleep` : 'sleep unset'}</span>
                  <span>PEM {body.pemRisk || 'unset'}</span>
                  <span>{body.recordedAt ? relativeTime(body.recordedAt) : 'no check-in'}</span>
                </div>
                <SignalEditor
                  values={signals}
                  setValues={setSignals}
                  onSave={saveSignals}
                  isSaving={isSaving}
                />
              </section>

              <section className="coach-note">
                <p className="micro-label">COACH READ</p>
                <blockquote>{brief.coach.opening}</blockquote>
                <p>{brief.coach.pattern}</p>
                <div className="coach-pacing">
                  <TimerReset size={17} />
                  <span>{brief.coach.pacing}</span>
                </div>
              </section>
            </aside>
          </section>

          <section className="effort-band">
            <div className="section-heading">
              <div>
                <p className="micro-label">LAST 7 DAYS</p>
                <h2>Effort telemetry</h2>
              </div>
              <Clock3 size={21} />
            </div>
            {brief.toggl ? (
              <div className="effort-grid">
                <div className="effort-total">
                  <strong>{duration(brief.toggl.totalSeconds)}</strong>
                  <span>{brief.toggl.sessions} tracked sessions</span>
                </div>
                <div className="effort-list">
                  {brief.toggl.topProjects.slice(0, 4).map((project) => (
                    <div className="effort-row" key={project.name}>
                      <span>{project.name}</span>
                      <strong>{duration(project.seconds)}</strong>
                    </div>
                  ))}
                </div>
                <div className="current-timer">
                  <p className="micro-label">CURRENT TIMER</p>
                  {brief.toggl.running ? (
                    <>
                      <strong>{brief.toggl.running.description}</strong>
                      <span>{duration(brief.toggl.running.seconds)}</span>
                    </>
                  ) : (
                    <span>No timer running</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="section-empty">Toggl is not reachable. No effort conclusion was inferred.</p>
            )}
            <div className="momentum-readout">
              <div>
                <p className="micro-label">MOMENTUM STREAKS</p>
                <strong>
                  {momentumSummary
                    ? `${momentumSummary.completedToday}/${momentumSummary.totalHabits} today`
                    : 'Device bridge waiting'}
                </strong>
              </div>
              {momentumSummary && (
                <div className="momentum-stats">
                  <span>{momentumSummary.contactsLast7Days} habit contacts / 7d</span>
                  <span>{momentumSummary.hardThingsCompletedLast7Days} hard things / 7d</span>
                  <span>read {relativeTime(momentumSummary.generatedAt)}</span>
                </div>
              )}
            </div>
          </section>

          <section className="symbolic-band">
            <div className="symbolic-main">
              <div className="section-heading">
                <div>
                  <p className="micro-label">SYMBOLIC WEATHER // OPTIONAL LENS</p>
                  <h2>{brief.astrology.interpretation.headline}</h2>
                </div>
                <MoonStar size={22} />
              </div>
              <div className="sky-facts">
                <span>Moon {sky?.moonDegree}° {sky?.moonSign}</span>
                <span>{sky?.moonPhase}</span>
                <span>Sun {sky?.sunDegree}° {sky?.sunSign}</span>
              </div>
              <p className="symbolic-direction">{brief.astrology.interpretation.direction}</p>
              <p className="symbolic-caution">{brief.astrology.interpretation.caution}</p>
              <div className="aspect-table">
                {brief.astrology.strongestAspects.slice(0, 3).map((aspect) => (
                  <span key={`${aspect.transit}-${aspect.natal}-${aspect.aspect}`}>
                    {aspect.transit} {aspect.aspect} natal {aspect.natal}
                    <small>{aspect.orb}° orb</small>
                  </span>
                ))}
              </div>
            </div>

            <aside className="source-panel">
              <div className="section-heading">
                <div>
                  <p className="micro-label">POSTED FORECAST</p>
                  <h2>{source?.title || 'Notion source offline'}</h2>
                </div>
                <BookOpenText size={20} />
              </div>
              {source?.excerpts?.length ? (
                <ul>
                  {source.excerpts.slice(0, 4).map((excerpt) => <li key={excerpt}>{excerpt}</li>)}
                </ul>
              ) : (
                <p className="section-empty">No current forecast excerpt was available.</p>
              )}
              {source?.url && (
                <a href={source.url} target="_blank" rel="noreferrer" className="text-link">
                  Open source in Notion <ExternalLink size={14} />
                </a>
              )}
            </aside>
          </section>

          <section className="ritual-line">
            <Target size={20} />
            <div>
              <p className="micro-label">CHAOS PROTOCOL</p>
              <p><strong>Adopt:</strong> {brief.coach.symbolicPrompt}</p>
              <p><strong>Test:</strong> {brief.coach.reflection}</p>
              <p><strong>Release:</strong> Record the result; keep the symbol only if it earns its place.</p>
            </div>
          </section>

          <footer>
            <span>{brief.boundaries.coaching}</span>
            <span>{brief.boundaries.astrology}</span>
          </footer>
        </>
      )}

      {settingsOpen && (
        <SettingsPanel
          secret={secret}
          setSecret={setSecret}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  )
}
