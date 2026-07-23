import * as AstronomyModule from 'astronomy-engine'

const {
  Body,
  Ecliptic,
  GeoVector,
  MoonPhase,
} = AstronomyModule.default || AstronomyModule

export const LIFE_PROJECTS_DATABASE_ID = 'd54d374d-bf65-4e52-955e-22138623388c'
export const BODY_SIGNALS_DATABASE_ID = '01a5184fc8c340e0a0545ab4b0881585'
export const OPERATIONS_ROOM_PAGE_ID = '309c051d-73d2-8108-a5d6-cf4618a7e4cf'
export const TOGGL_WORKSPACE_ID = 20839628

const NOTION_VERSION = '2022-06-28'
const DAY_MS = 86_400_000
const BIRTH_DATE = new Date('1985-05-02T01:27:00.000Z')
const BIRTH_PLACE = 'Eugene, Oregon'
const PLANETS = [
  Body.Sun,
  Body.Moon,
  Body.Mercury,
  Body.Venus,
  Body.Mars,
  Body.Jupiter,
  Body.Saturn,
  Body.Uranus,
  Body.Neptune,
  Body.Pluto,
]
const PERSONAL_PLANETS = new Set([
  Body.Sun,
  Body.Moon,
  Body.Mercury,
  Body.Venus,
  Body.Mars,
])
const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]
const ASPECTS = [
  { angle: 0, name: 'conjunction', tone: 'concentrated' },
  { angle: 60, name: 'sextile', tone: 'supportive' },
  { angle: 90, name: 'square', tone: 'friction' },
  { angle: 120, name: 'trine', tone: 'supportive' },
  { angle: 180, name: 'opposition', tone: 'polarity' },
]
const BODY_THEMES = {
  Sun: 'direction and visibility',
  Moon: 'needs and emotional pace',
  Mercury: 'thinking and communication',
  Venus: 'values, attraction, and resources',
  Mars: 'drive and conflict',
  Jupiter: 'growth and confidence',
  Saturn: 'limits and durable structure',
  Uranus: 'change and experimentation',
  Neptune: 'imagination and uncertainty',
  Pluto: 'deep revision and power',
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function plainText(items) {
  return (items || []).map((item) => item?.plain_text || item?.text?.content || '').join('').trim()
}

export function notionPropertyValue(property) {
  if (!property || typeof property !== 'object') return null

  switch (property.type) {
    case 'title':
      return plainText(property.title)
    case 'rich_text':
      return plainText(property.rich_text)
    case 'number':
      return property.number
    case 'select':
      return property.select?.name || null
    case 'status':
      return property.status?.name || null
    case 'multi_select':
      return (property.multi_select || []).map((item) => item.name)
    case 'date':
      return property.date?.start || null
    case 'checkbox':
      return Boolean(property.checkbox)
    case 'formula':
      return property.formula?.[property.formula.type] ?? null
    case 'rollup':
      return property.rollup?.[property.rollup.type] ?? null
    case 'url':
      return property.url || null
    default:
      return null
  }
}

function propertyByAliases(properties, aliases) {
  const aliasSet = new Set(aliases.map(normalizeName))
  const entry = Object.entries(properties || {}).find(([name]) => aliasSet.has(normalizeName(name)))
  return entry ? notionPropertyValue(entry[1]) : null
}

function titleOf(page) {
  const property = Object.values(page?.properties || {}).find((item) => item.type === 'title')
  return String(notionPropertyValue(property) || '').trim()
}

function daysSince(value, now) {
  if (!value) return Number.POSITIVE_INFINITY
  const time = Date.parse(value)
  return Number.isFinite(time) ? Math.max(0, (now.getTime() - time) / DAY_MS) : Number.POSITIVE_INFINITY
}

function moneyGravity(name, declared) {
  const declaredNumber = numberOrNull(declared)
  if (declaredNumber != null) return clamp(declaredNumber, 0, 100)

  const value = normalizeName(name)
  if (/editing reel|editor reel|portfolio|job search|facilitation|group solutions/.test(value)) return 100
  if (/ancient paths|aa curriculum|signal fidelity|autistic communicator/.test(value)) return 74
  if (/cashflow|finance|dating tracker|sixpm|momentum streaks/.test(value)) return 68
  if (/music|walker|idyllwild|louis cole|bird|plrm|atmom/.test(value)) return 45
  if (/lifeos|life os|archive|pipeline|infrastructure/.test(value)) return 24
  return 35
}

function statusIsActive(status) {
  const value = normalizeName(status)
  if (!value) return true
  return !/(done|complete|completed|archived|icebox|cancelled|paused|on hold|dormant)/.test(value)
}

export function rankProjects(pages, now = new Date()) {
  return (Array.isArray(pages) ? pages : [])
    .map((page) => {
      const properties = page.properties || {}
      const name = titleOf(page)
      const status = propertyByAliases(properties, ['Status', 'Project Status'])
      const progressRaw = numberOrNull(propertyByAliases(properties, ['Progress', 'Percent', 'Completion']))
      const progress = progressRaw == null ? null : clamp(progressRaw <= 1 ? progressRaw * 100 : progressRaw, 0, 100)
      const priority = String(propertyByAliases(properties, ['Priority']) || '')
      const nextAction = String(propertyByAliases(properties, [
        'Next Action',
        'Next Push',
        'Current Gate',
        'Next Step',
      ]) || '').trim()
      const whyNow = String(propertyByAliases(properties, ['Why Now', 'Purpose', 'Outcome']) || '').trim()
      const deadline = propertyByAliases(properties, ['Ship Date', 'Deadline', 'Due'])
      const gravity = moneyGravity(name, propertyByAliases(properties, ['Money Gravity']))
      const editedDays = daysSince(page.last_edited_time, now)
      const priorityBoost = /urgent|critical|high|now|p0|p1/.test(normalizeName(priority)) ? 22 : 0
      const finishBoost = progress != null && progress >= 70 ? 12 : 0
      const actionBoost = nextAction ? 9 : 0
      const recencyBoost = editedDays <= 7 ? 8 : editedDays <= 30 ? 3 : 0
      const deadlineBoost = deadline && daysSince(deadline, now) >= -14 ? 6 : 0
      const score = gravity + priorityBoost + finishBoost + actionBoost + recencyBoost + deadlineBoost

      return {
        id: page.id,
        name,
        status: String(status || 'Active'),
        progress,
        nextAction: nextAction || 'Open the project and choose the smallest visible finish.',
        whyNow,
        deadline,
        moneyGravity: gravity,
        notionUrl: page.url || null,
        score,
      }
    })
    .filter((project) => project.name && statusIsActive(project.status))
    .sort((a, b) => b.score - a.score || (b.progress || 0) - (a.progress || 0))
    .slice(0, 3)
}

function bodyName(body) {
  return String(body)
}

function longitude(body, date) {
  return Ecliptic(GeoVector(body, date, true)).elon
}

function normalizeAngle(value) {
  return ((value % 360) + 360) % 360
}

function angularDistance(a, b) {
  const distance = Math.abs(normalizeAngle(a) - normalizeAngle(b))
  return Math.min(distance, 360 - distance)
}

function signAt(value) {
  const normalized = normalizeAngle(value)
  const signIndex = Math.floor(normalized / 30)
  return {
    sign: SIGNS[signIndex],
    degree: normalized - signIndex * 30,
  }
}

function phaseName(angle) {
  if (angle < 22.5 || angle >= 337.5) return 'new moon'
  if (angle < 67.5) return 'waxing crescent'
  if (angle < 112.5) return 'first quarter'
  if (angle < 157.5) return 'waxing gibbous'
  if (angle < 202.5) return 'full moon'
  if (angle < 247.5) return 'waning gibbous'
  if (angle < 292.5) return 'last quarter'
  return 'waning crescent'
}

function aspectInterpretation(aspect) {
  if (!aspect) {
    return {
      headline: 'Steady integration day',
      direction: 'Use ordinary structure. Pick one meaningful action and let completion create the signal.',
      caution: 'There is no need to manufacture urgency from the sky.',
    }
  }

  const transitTheme = BODY_THEMES[aspect.transit] || aspect.transit
  const natalTheme = BODY_THEMES[aspect.natal] || aspect.natal

  if (aspect.tone === 'supportive') {
    return {
      headline: `${aspect.transit} ${aspect.name} natal ${aspect.natal}`,
      direction: `A symbolic opening links ${transitTheme} with ${natalTheme}. Use it for one concrete outward move, not more preparation.`,
      caution: 'Supportive timing still needs a real action before it becomes useful.',
    }
  }

  if (aspect.tone === 'friction' || aspect.tone === 'polarity') {
    return {
      headline: `${aspect.transit} ${aspect.name} natal ${aspect.natal}`,
      direction: `Expect tension between ${transitTheme} and ${natalTheme}. Reduce the scope, name the conflict, and keep the next action reversible.`,
      caution: 'Treat friction as information, not a prediction of failure.',
    }
  }

  return {
    headline: `${aspect.transit} conjunct natal ${aspect.natal}`,
    direction: `The symbolic emphasis is concentrated around ${natalTheme}. Give that theme one bounded container today.`,
    caution: 'Intensity is not the same as importance. Keep the WIP limit.',
  }
}

export function calculateAstrology(now = new Date()) {
  const current = new Map(PLANETS.map((body) => [bodyName(body), longitude(body, now)]))
  const natal = new Map(PLANETS.map((body) => [bodyName(body), longitude(body, BIRTH_DATE)]))
  const aspects = []

  for (const [transit, transitLongitude] of current) {
    for (const [natalBody, natalLongitude] of natal) {
      const includePair =
        PERSONAL_PLANETS.has(transit) ||
        PERSONAL_PLANETS.has(natalBody)
      if (!includePair) continue

      const distance = angularDistance(transitLongitude, natalLongitude)
      for (const aspect of ASPECTS) {
        const orb = Math.abs(distance - aspect.angle)
        const maxOrb = transit === Body.Moon || transit === Body.Sun ? 3.5 : 2.5
        if (orb <= maxOrb) {
          aspects.push({
            transit,
            natal: natalBody,
            aspect: aspect.name,
            name: aspect.name,
            tone: aspect.tone,
            orb: Number(orb.toFixed(2)),
            exactAngle: aspect.angle,
          })
        }
      }
    }
  }

  aspects.sort((a, b) => a.orb - b.orb)
  const strongest = aspects[0] || null
  const moon = signAt(current.get(Body.Moon))
  const sun = signAt(current.get(Body.Sun))
  const phaseAngle = normalizeAngle(MoonPhase(now))

  return {
    calculatedAt: now.toISOString(),
    method: 'Geocentric planetary positions calculated with Astronomy Engine; interpretive text is symbolic.',
    birth: {
      date: BIRTH_DATE.toISOString(),
      place: BIRTH_PLACE,
    },
    sky: {
      moonSign: moon.sign,
      moonDegree: Number(moon.degree.toFixed(1)),
      sunSign: sun.sign,
      sunDegree: Number(sun.degree.toFixed(1)),
      moonPhase: phaseName(phaseAngle),
      phaseAngle: Number(phaseAngle.toFixed(1)),
    },
    strongestAspects: aspects.slice(0, 5),
    interpretation: aspectInterpretation(strongest),
  }
}

function durationSeconds(entry, now = Date.now()) {
  const duration = Number(entry?.duration)
  if (duration >= 0) return duration
  const started = Date.parse(entry?.start)
  return Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : 0
}

export function summarizeToggl(entries, projects = [], now = new Date()) {
  const projectNames = new Map((projects || []).map((project) => [String(project.id), project.name]))
  const weekStart = now.getTime() - 7 * DAY_MS
  const completed = (entries || []).filter((entry) => entry?.stop && Date.parse(entry.start) >= weekStart)
  const running = (entries || []).find((entry) => !entry?.stop && Number(entry?.duration) < 0) || null
  const buckets = new Map()

  for (const entry of completed) {
    const label = projectNames.get(String(entry.project_id)) || entry.description || 'Unassigned'
    const seconds = durationSeconds(entry, now.getTime())
    const bucket = buckets.get(label) || { name: label, seconds: 0, sessions: 0 }
    bucket.seconds += seconds
    bucket.sessions += 1
    buckets.set(label, bucket)
  }

  const totalSeconds = completed.reduce((sum, entry) => sum + durationSeconds(entry, now.getTime()), 0)
  return {
    windowDays: 7,
    totalSeconds,
    sessions: completed.length,
    topProjects: [...buckets.values()]
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 5),
    running: running
      ? {
          description: running.description || 'Untitled timer',
          project: projectNames.get(String(running.project_id)) || null,
          startedAt: running.start,
          seconds: durationSeconds(running, now.getTime()),
        }
      : null,
  }
}

function projectMatchesEffort(project, effort) {
  const projectWords = normalizeName(project.name).split(' ').filter((word) => word.length > 3)
  const effortName = normalizeName(effort.name)
  return projectWords.some((word) => effortName.includes(word))
}

export function buildCoachBrief({ projects, toggl, body, astrology }) {
  const primary = projects[0] || null
  const physical = numberOrNull(body?.physiologicalCapacity)
  const cognitive = numberOrNull(body?.cognitiveActivation)
  const lowCapacity = physical != null && physical <= 3
  const lowActivation = cognitive != null && cognitive <= 3
  const leadingEffort = toggl?.topProjects?.[0] || null
  const effortAligned = primary && leadingEffort ? projectMatchesEffort(primary, leadingEffort) : null

  let opening = 'Choose one finishable action before opening another system.'
  if (lowCapacity) {
    opening = 'Your physical capacity is the governing constraint today. Protect it and shrink the work, not your standards.'
  } else if (lowActivation) {
    opening = 'Activation is low. Start with a two-minute contact action that leaves the project visibly more open than before.'
  } else if (primary) {
    opening = `The strongest current lane is ${primary.name}. The job is contact, not a heroic session.`
  }

  let pattern = 'Not enough recent effort data is available to compare intention with time.'
  if (leadingEffort && primary) {
    pattern = effortAligned
      ? `Recent effort is aligned: ${leadingEffort.name} is leading the last seven days.`
      : `Recent effort is concentrated in ${leadingEffort.name}, while the current lock is ${primary.name}. Check whether that is a real obligation or displacement.`
  }

  return {
    opening,
    pattern,
    primaryAction: primary?.nextAction || 'Refresh Notion project data, then choose one visible finish.',
    pacing: lowCapacity
      ? 'One project, one small action, then reassess your body.'
      : 'One locked target and no more than two on-deck projects.',
    reflection: 'What would count as honest contact with the work, even if the day stayed imperfect?',
    symbolicPrompt: astrology?.interpretation?.direction || 'Use the symbolic layer as a question, not an order.',
  }
}

function extractBodySignals(page) {
  const properties = page?.properties || {}
  return {
    cognitiveActivation: numberOrNull(propertyByAliases(properties, [
      'Cognitive Activation',
      'Cognitive',
    ])),
    physiologicalCapacity: numberOrNull(propertyByAliases(properties, [
      'Physiological Capacity',
      'Capacity',
    ])),
    creativeTemperature: numberOrNull(propertyByAliases(properties, [
      'Creative Temperature',
      'Creative',
    ])),
    sleepHours: numberOrNull(propertyByAliases(properties, ['Sleep Hours', 'Sleep'])),
    focusMode: propertyByAliases(properties, ['Focus Mode', 'Mode']),
    bodyState: propertyByAliases(properties, ['Body State', 'Body']),
    mood: propertyByAliases(properties, ['Mood']),
    pemRisk: propertyByAliases(properties, ['PEM Risk', 'PEM']),
    notes: propertyByAliases(properties, ['Free Text', 'Notes', 'Signal Notes']),
    recordedAt: page?.created_time || null,
  }
}

function blockText(block) {
  const data = block?.[block.type]
  return plainText(data?.rich_text || data?.caption || [])
}

function usefulAstrologyLine(block) {
  const text = blockText(block)
  if (!text) return null
  const type = block.type || ''
  const keep =
    type.startsWith('heading_') ||
    type === 'callout' ||
    type === 'quote' ||
    /key date|overall theme|window|best day|caution|career|creative|energy/i.test(text)
  if (!keep) return null
  return text.slice(0, 280)
}

async function notionRequest(path, env, options = {}) {
  const token = env.NOTION_API_KEY
  if (!token) throw new Error('NOTION_API_KEY is not configured')

  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}
  if (!response.ok) {
    throw new Error(payload?.message || `Notion request failed (${response.status})`)
  }
  return payload
}

async function fetchProjects(env, now) {
  const databaseId = env.NOTION_LIFE_PROJECTS_DATABASE_ID || LIFE_PROJECTS_DATABASE_ID
  const payload = await notionRequest(`/databases/${databaseId}/query`, env, {
    method: 'POST',
    body: JSON.stringify({ page_size: 100 }),
  })
  return rankProjects(payload.results, now)
}

async function fetchLatestBodySignals(env) {
  const databaseId = env.NOTION_BODY_SIGNALS_DATABASE_ID || BODY_SIGNALS_DATABASE_ID
  const payload = await notionRequest(`/databases/${databaseId}/query`, env, {
    method: 'POST',
    body: JSON.stringify({
      page_size: 1,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    }),
  })
  return payload.results?.[0] ? extractBodySignals(payload.results[0]) : null
}

async function fetchAstrologySource(env, now) {
  const search = await notionRequest('/search', env, {
    method: 'POST',
    body: JSON.stringify({
      query: 'Tactical Astrology Map',
      page_size: 20,
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      filter: { property: 'object', value: 'page' },
    }),
  })
  const month = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const candidates = (search.results || []).filter((page) =>
    /tactical astrology map|operations room/i.test(titleOf(page))
  )
  const page =
    candidates.find((candidate) => titleOf(candidate).includes(month)) ||
    candidates[0] ||
    { id: env.NOTION_ASTROLOGY_PAGE_ID || OPERATIONS_ROOM_PAGE_ID }
  const pageDetails = page.url ? page : await notionRequest(`/pages/${page.id}`, env)
  const blocks = await notionRequest(`/blocks/${page.id}/children?page_size=100`, env)
  const excerpts = (blocks.results || [])
    .map(usefulAstrologyLine)
    .filter(Boolean)
    .slice(0, 10)

  return {
    title: titleOf(pageDetails) || 'The Operations Room',
    url: pageDetails.url || null,
    updatedAt: pageDetails.last_edited_time || null,
    excerpts,
  }
}

function togglAuth(env) {
  const token = env.TOGGL_API_TOKEN
  if (!token) throw new Error('TOGGL_API_TOKEN is not configured')
  return `Basic ${Buffer.from(`${token}:api_token`).toString('base64')}`
}

async function togglRequest(path, env) {
  const response = await fetch(`https://api.track.toggl.com/api/v9${path}`, {
    headers: { Authorization: togglAuth(env) },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(payload?.message || `Toggl request failed (${response.status})`)
  }
  return payload
}

async function fetchToggl(env, now) {
  const start = new Date(now.getTime() - 8 * DAY_MS).toISOString()
  const end = now.toISOString()
  const [entries, projects] = await Promise.all([
    togglRequest(`/me/time_entries?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`, env),
    togglRequest(`/workspaces/${env.TOGGL_WORKSPACE_ID || TOGGL_WORKSPACE_ID}/projects?active=true`, env),
  ])
  return summarizeToggl(entries, projects, now)
}

async function settleConnector(name, operation) {
  const startedAt = Date.now()
  try {
    const data = await operation()
    return {
      name,
      status: 'live',
      latencyMs: Date.now() - startedAt,
      data,
      error: null,
    }
  } catch (error) {
    return {
      name,
      status: 'unavailable',
      latencyMs: Date.now() - startedAt,
      data: null,
      error: error.message,
    }
  }
}

export async function buildMorningBrief(env = process.env, now = new Date()) {
  const astrology = calculateAstrology(now)
  const [projectsResult, togglResult, bodyResult, sourceResult] = await Promise.all([
    settleConnector('notion-projects', () => fetchProjects(env, now)),
    settleConnector('toggl', () => fetchToggl(env, now)),
    settleConnector('body-signals', () => fetchLatestBodySignals(env)),
    settleConnector('notion-astrology', () => fetchAstrologySource(env, now)),
  ])
  const projects = projectsResult.data || []
  const toggl = togglResult.data
  const body = bodyResult.data

  return {
    ok: true,
    generatedAt: now.toISOString(),
    projects,
    toggl,
    body,
    astrology: {
      ...astrology,
      source: sourceResult.data,
    },
    coach: buildCoachBrief({ projects, toggl, body, astrology }),
    momentum: {
      status: 'device-only',
      message: 'Momentum Streaks stores its history on this device. A secure cross-app bridge is still required for automatic reads.',
    },
    connectors: [projectsResult, togglResult, bodyResult, sourceResult].map(
      ({ name, status, latencyMs, error }) => ({ name, status, latencyMs, error })
    ),
    boundaries: {
      coaching: 'Reflective planning support, not therapy or medical care.',
      astrology: 'A symbolic timing lens, not evidence or a substitute for health, financial, legal, or safety decisions.',
    },
  }
}
