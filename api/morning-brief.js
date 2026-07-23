import { timingSafeEqual } from 'node:crypto'
import { buildMorningBrief } from './lib/morning-brief.js'

function verifySecret(providedSecret, expectedSecret) {
  const provided = Buffer.from(String(providedSecret || ''))
  const expected = Buffer.from(String(expectedSecret || ''))
  return provided.length > 0 &&
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  response.setHeader('Cache-Control', 'private, no-store')

  if (!verifySecret(request.headers['x-morning-secret'], process.env.MORNING_CONSOLE_SECRET)) {
    response.status(401).json({ ok: false, error: 'Enter the Morning Console access key.' })
    return
  }

  try {
    const brief = await buildMorningBrief(process.env)
    response.status(200).json(brief)
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message || 'Briefing failed' })
  }
}
