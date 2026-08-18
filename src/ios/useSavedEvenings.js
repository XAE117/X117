import { useCallback, useEffect, useRef, useState } from 'react'
import { nativeAdapter } from './native/nativeAdapter.js'
import {
  completeSavedEvening,
  createSavedEvening,
  loadSavedEvenings,
  persistSavedEvenings,
  withSavedEveningReminder,
} from './savedEvenings.js'

const currentDate = () => new Date()

export function useSavedEvenings({ adapter = nativeAdapter, clock = currentDate } = {}) {
  const [evenings, setEvenings] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const eveningsRef = useRef([])

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const next = await loadSavedEvenings({ adapter, now: clock() })
      eveningsRef.current = next
      setEvenings(next)
      setStatus('ready')
      return next
    } catch (nextError) {
      setError(nextError)
      setStatus('error')
      return []
    }
  }, [adapter, clock])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) void load()
    })
    return () => {
      active = false
    }
  }, [load])

  const persist = useCallback(async updater => {
    const next = updater(eveningsRef.current)
    const persisted = await persistSavedEvenings(next, { adapter, now: clock() })
    eveningsRef.current = persisted
    setEvenings(persisted)
    setStatus('ready')
    return persisted
  }, [adapter, clock])

  const saveDraft = useCallback(async ({ cinema, food, catalog }) => {
    const evening = createSavedEvening({ cinema, food, catalog, now: clock() })
    const persisted = await persist(current => {
      const duplicate = current.find(item =>
        item.status === 'planned' &&
        item.cinema?.availability === 'available' &&
        item.food?.availability === 'available' &&
        item.cinema.id === evening.cinema.id &&
        item.food.id === evening.food.id,
      )
      return duplicate ? current : [evening, ...current]
    })
    return persisted.find(item => item.id === evening.id) || persisted.find(item =>
      item.status === 'planned' &&
      item.cinema?.availability === 'available' &&
      item.food?.availability === 'available' &&
      item.cinema.id === evening.cinema.id &&
      item.food.id === evening.food.id,
    ) || null
  }, [clock, persist])

  const update = useCallback(async (id, updater) => {
    let updated = null
    await persist(current => current.map(item => {
      if (item.id !== id) return item
      updated = updater(item)
      return updated
    }))
    return updated
  }, [persist])

  const complete = useCallback(id => update(id, item => completeSavedEvening(item, clock())), [clock, update])

  const setReminder = useCallback((id, reminder) => update(
    id,
    item => withSavedEveningReminder(item, reminder, clock()),
  ), [clock, update])

  const setCalendar = useCallback((id, calendar) => update(id, item => ({
    ...item,
    calendar,
    updatedAt: clock().toISOString(),
  })), [clock, update])

  const remove = useCallback(async id => {
    const removed = eveningsRef.current.find(item => item.id === id) || null
    await persist(current => current.filter(item => item.id !== id))
    return removed
  }, [persist])

  const clear = useCallback(async () => persist(() => []), [persist])

  return {
    evenings,
    status,
    error,
    load,
    saveDraft,
    complete,
    setReminder,
    setCalendar,
    remove,
    clear,
  }
}
