import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { submitBodySignals, verifyMorningSecret } from './api/body-signals.js'

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 100_000) {
        reject(new Error('Request body is too large'))
        req.destroy()
      }
    })

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Request body must be valid JSON'))
      }
    })

    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function bodySignalsApi(env) {
  return {
    name: 'body-signals-api',
    configureServer(server) {
      server.middlewares.use('/api/body-signals', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Allow', 'POST, OPTIONS')
          res.end()
          return
        }

        if (req.method !== 'POST') {
          next()
          return
        }

        if (!verifyMorningSecret(req.headers['x-morning-secret'], env)) {
          sendJson(res, 401, { ok: false, error: 'Unauthorized' })
          return
        }

        try {
          const payload = await readRequestBody(req)
          const result = await submitBodySignals(payload, env)
          sendJson(res, 200, { ok: true, ...result })
        } catch (error) {
          sendJson(res, 400, { ok: false, error: error.message })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }

  return {
    plugins: [react(), bodySignalsApi(env)],
    base: env.VITE_BASE_PATH || '/X117/',
  }
})
