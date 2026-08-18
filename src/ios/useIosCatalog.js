import { useCallback, useEffect, useState } from 'react'
import { loadRemoteCatalog } from './catalog.js'

export function useIosCatalog({ baseUrl, loader = loadRemoteCatalog } = {}) {
  const [catalog, setCatalog] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  const refresh = useCallback(async ({ signal } = {}) => {
    setStatus(current => current === 'ready' ? 'refreshing' : 'loading')
    setError(null)
    try {
      const next = await loader({ baseUrl, signal })
      if (signal?.aborted) return null
      setCatalog(next)
      setStatus('ready')
      return next
    } catch (nextError) {
      if (signal?.aborted) return null
      setError(nextError)
      setStatus('error')
      return null
    }
  }, [baseUrl, loader])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    // Start after the effect has subscribed so the initial state transition is
    // asynchronous and can be cancelled during StrictMode remounts.
    Promise.resolve().then(() => {
      if (active) return refresh({ signal: controller.signal })
      return null
    })
    return () => {
      active = false
      controller.abort()
    }
  }, [refresh])

  return { catalog, status, error, refresh }
}
