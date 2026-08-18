import { useCallback, useEffect, useState } from 'react'
import { loadRemoteCatalog } from './catalog.js'
import { loadOfflineCatalogSnapshot, saveOfflineCatalogSnapshot } from './offlineCatalog.js'
import { nativeAdapter } from './native/nativeAdapter.js'

export function useIosCatalog({
  baseUrl,
  loader = loadRemoteCatalog,
  adapter = nativeAdapter,
  snapshotLoader = loadOfflineCatalogSnapshot,
  snapshotSaver = saveOfflineCatalogSnapshot,
} = {}) {
  const [catalog, setCatalog] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  const refresh = useCallback(async ({ signal } = {}) => {
    setStatus(current => current === 'ready' ? 'refreshing' : 'loading')
    setError(null)
    try {
      const next = await loader({ baseUrl, signal })
      if (signal?.aborted) return null
      try {
        await snapshotSaver(next, { adapter })
      } catch {
        // A live verified catalog remains usable if the local snapshot cannot
        // be written. The next refresh can try persistence again.
      }
      if (signal?.aborted) return null
      setCatalog(next)
      setStatus('ready')
      return next
    } catch (nextError) {
      if (signal?.aborted) return null
      let offlineCatalog = null
      try {
        offlineCatalog = await snapshotLoader({ adapter })
      } catch {
        offlineCatalog = null
      }
      if (signal?.aborted) return null
      if (offlineCatalog) {
        setCatalog(offlineCatalog)
        setError(nextError)
        setStatus('offline')
        return offlineCatalog
      }
      setError(nextError)
      setStatus('error')
      return null
    }
  }, [adapter, baseUrl, loader, snapshotLoader, snapshotSaver])

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
