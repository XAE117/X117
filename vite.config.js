import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { submitBodySignals, verifyMorningSecret } from './api/body-signals.js'
import { buildMorningBrief } from './api/lib/morning-brief.js'

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

function morningBriefApi(env) {
  return {
    name: 'morning-brief-api',
    configureServer(server) {
      server.middlewares.use('/api/morning-brief', async (req, res, next) => {
        if (req.method !== 'GET') {
          next()
          return
        }

        if (!verifyMorningSecret(req.headers['x-morning-secret'], env)) {
          sendJson(res, 401, { ok: false, error: 'Enter the Morning Console access key.' })
          return
        }

        try {
          sendJson(res, 200, await buildMorningBrief(env))
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error.message })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  const isIosBuild = mode === 'ios'

  return {
    // The Capacitor shell is a separate product entrypoint. Keeping its build
    // free of the web-only dev API plugins and public directory prevents
    // private/tangential products from being copied into the native bundle.
    plugins: isIosBuild ? [react()] : [react(), bodySignalsApi(env), morningBriefApi(env)],
    base: isIosBuild ? './' : env.VITE_BASE_PATH || '/X117/',
    // Local iOS development may serve the generated catalog from this checkout,
    // while the release build copies no legacy public assets into dist-ios.
    publicDir: isIosBuild && command === 'build' ? false : 'public',
    build: {
      outDir: isIosBuild ? 'dist-ios' : 'dist',
      rollupOptions: {
        input: isIosBuild
          ? resolve(process.cwd(), 'ios.html')
          : {
              main: resolve(process.cwd(), 'index.html'),
              morningConsole: resolve(process.cwd(), 'morning-console.html'),
            },
      },
    },
  }
})
