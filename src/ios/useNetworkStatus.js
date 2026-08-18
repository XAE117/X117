import { useEffect, useState } from 'react'
import { nativeAdapter } from './native/nativeAdapter.js'

const INITIAL_STATUS = { connected: true, connectionType: 'unknown' }

export function useNetworkStatus(adapter = nativeAdapter) {
  const [status, setStatus] = useState(INITIAL_STATUS)

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}

    Promise.resolve().then(async () => {
      const nextStatus = await adapter.getNetworkStatus()
      if (active) setStatus(nextStatus)
      unsubscribe = await adapter.subscribeNetworkStatus(next => {
        if (active) setStatus(next)
      })
    }).catch(() => {
      if (active) setStatus({ connected: false, connectionType: 'unknown' })
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [adapter])

  return status
}
