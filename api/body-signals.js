import { timingSafeEqual } from 'node:crypto'

const DEFAULT_DATABASE_ID = '01a5184fc8c340e0a0545ab4b0881585'
const NOTION_VERSION = '2022-06-28'

const FIELD_TYPES = {
  cognitive_activation: 'number',
  physiological_capacity: 'number',
  creative_temperature: 'number',
  sleep_hours: 'number',
  focus_mode: 'text',
  active_projects: 'array',
  body_state: 'text',
  mood: 'text',
  pem_risk: 'text',
  free_text: 'text',
}

const FIELD_ALIASES = {
  cognitive_activation: ['cognitive_activation', 'cognitive activation', 'cognitive'],
  physiological_capacity: ['physiological_capacity', 'physiological capacity', 'capacity'],
  creative_temperature: ['creative_temperature', 'creative temperature', 'creative'],
  sleep_hours: ['sleep_hours', 'sleep hours', 'sleep'],
  focus_mode: ['focus_mode', 'focus mode', 'mode'],
  active_projects: ['active_projects', 'active projects', 'projects'],
  body_state: ['body_state', 'body state', 'body'],
  mood: ['mood'],
  pem_risk: ['pem_risk', 'pem risk', 'pem'],
  free_text: ['free_text', 'free text', 'notes', 'note', 'journal', 'signal notes'],
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function verifyMorningSecret(providedSecret, env = process.env) {
  const expectedSecret = String(env.MORNING_CONSOLE_SECRET || '')
  const provided = String(providedSecret || '')

  if (!expectedSecret || !provided) return false

  const expectedBuffer = Buffer.from(expectedSecret)
  const providedBuffer = Buffer.from(provided)

  return expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
}

function richText(content) {
  const text = String(content ?? '').slice(0, 2000)

  return text ? [{ type: 'text', text: { content: text } }] : []
}

function titleText(content) {
  const text = String(content ?? '').slice(0, 2000)

  return text ? [{ type: 'text', text: { content: text } }] : []
}

function selectName(content) {
  const name = String(content ?? '').trim().slice(0, 100)

  return name ? { name } : null
}

function toNumber(value, field) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    throw new Error(`${field} must be a number`)
  }

  return number
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be a JSON object')
  }

  const clean = {}

  for (const [field, type] of Object.entries(FIELD_TYPES)) {
    if (!(field in payload)) continue

    if (type === 'number') {
      clean[field] = toNumber(payload[field], field)
      continue
    }

    if (type === 'array') {
      if (!Array.isArray(payload[field])) {
        throw new Error(`${field} must be an array`)
      }

      clean[field] = payload[field].map((item) => String(item).trim()).filter(Boolean)
      continue
    }

    clean[field] = String(payload[field] ?? '').trim()
  }

  if (!('free_text' in clean)) {
    clean.free_text = String(payload.freeText || payload.notes || payload.note || '').trim()
  }

  return clean
}

function buildPropertyIndex(properties) {
  const entries = Object.entries(properties || {})

  return entries.map(([name, config]) => ({
    name,
    type: config.type,
    normalized: normalizeName(name),
  }))
}

function findProperty(propertyIndex, field) {
  const aliases = FIELD_ALIASES[field].map(normalizeName)

  return propertyIndex.find((property) => aliases.includes(property.normalized))
}

function setTypedProperty(property, field, value) {
  if (value === undefined || value === null || value === '') return null
  if (Array.isArray(value) && value.length === 0) return null

  switch (property.type) {
    case 'number':
      return { number: Array.isArray(value) ? value.length : toNumber(value, field) }
    case 'select':
      return { select: selectName(Array.isArray(value) ? value.join(', ') : value) }
    case 'status':
      return { status: selectName(Array.isArray(value) ? value.join(', ') : value) }
    case 'multi_select':
      return {
        multi_select: Array.isArray(value)
          ? value.map(selectName).filter(Boolean)
          : [selectName(value)].filter(Boolean),
      }
    case 'rich_text':
      return { rich_text: richText(Array.isArray(value) ? value.join(', ') : value) }
    case 'title':
      return { title: titleText(Array.isArray(value) ? value.join(', ') : value) }
    case 'url':
      return { url: String(value) }
    case 'email':
      return { email: String(value) }
    case 'phone_number':
      return { phone_number: String(value) }
    case 'checkbox':
      return { checkbox: Boolean(value) }
    default:
      return null
  }
}

function buildProperties(database, payload) {
  const propertyIndex = buildPropertyIndex(database.properties)
  const properties = {}
  const titleProperty = propertyIndex.find((property) => property.type === 'title')
  const now = new Date()

  if (titleProperty) {
    properties[titleProperty.name] = {
      title: titleText(`Morning Check-In - ${now.toLocaleDateString('en-US')}`),
    }
  }

  const dateProperty = propertyIndex.find((property) =>
    property.type === 'date' &&
    ['date', 'created', 'check in date', 'checkin date', 'day'].includes(property.normalized)
  )

  if (dateProperty) {
    properties[dateProperty.name] = { date: { start: now.toISOString() } }
  }

  for (const field of Object.keys(FIELD_TYPES)) {
    const property = findProperty(propertyIndex, field)
    if (!property) continue

    const notionValue = setTypedProperty(property, field, payload[field])
    if (notionValue) {
      properties[property.name] = notionValue
    }
  }

  return properties
}

function buildChildren(payload) {
  const children = []

  if (payload.free_text) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: richText(payload.free_text),
      },
    })
  }

  children.push({
    object: 'block',
    type: 'code',
    code: {
      language: 'json',
      rich_text: richText(JSON.stringify(payload, null, 2)),
    },
  })

  return children
}

async function notionFetch(path, options, env) {
  const token = env.NOTION_API_KEY

  if (!token) {
    throw new Error('NOTION_API_KEY is missing')
  }

  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
      ...(options.headers || {}),
    },
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = body.message || `Notion API returned ${response.status}`
    throw new Error(message)
  }

  return body
}

export async function submitBodySignals(rawPayload, env = process.env) {
  const databaseId = env.NOTION_BODY_SIGNALS_DATABASE_ID || DEFAULT_DATABASE_ID
  const payload = validatePayload(rawPayload)
  const database = await notionFetch(`/databases/${databaseId}`, { method: 'GET' }, env)
  const page = await notionFetch(
    '/pages',
    {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: buildProperties(database, payload),
        children: buildChildren(payload),
      }),
    },
    env
  )

  return {
    id: page.id,
    url: page.url,
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  if (!verifyMorningSecret(req.headers['x-morning-secret'])) {
    res.status(401).json({ ok: false, error: 'Unauthorized' })
    return
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const result = await submitBodySignals(payload)
    res.status(200).json({ ok: true, ...result })
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message })
  }
}
