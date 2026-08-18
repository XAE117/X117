import { Browser } from '@capacitor/browser'
import { Calendar } from '@capacitor/calendar'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Network } from '@capacitor/network'
import { Preferences } from '@capacitor/preferences'
import { Share } from '@capacitor/share'

const SIXPMAccessibility = registerPlugin('SIXPMAccessibility')

export const SIXPM_STORAGE_KEYS = Object.freeze({
  catalogSnapshot: 'sixpm.catalog-snapshot.v1',
  savedEvenings: 'sixpm.saved-evenings.v1',
  settings: 'sixpm.settings.v1',
})

function messageFor(error) {
  if (error instanceof Error && error.message) return error.message
  return 'This feature is unavailable right now.'
}

function supportedExternalUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function timestampFor(value, label) {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (!Number.isFinite(timestamp)) throw new Error(`${label} must be a valid date.`)
  return timestamp
}

function textFor(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`)
  return value.trim()
}

function localStorageFor(globalObject) {
  try {
    const storage = globalObject?.localStorage
    return storage && typeof storage.getItem === 'function' ? storage : null
  } catch {
    return null
  }
}

function statusForPermission(state) {
  if (state === 'granted') return 'granted'
  if (state === 'denied') return 'denied'
  return 'unavailable'
}

function normalizedTextScale(payload) {
  const scale = Number(payload?.scale)
  return {
    category: typeof payload?.category === 'string' && payload.category.trim()
      ? payload.category.trim()
      : 'UICTContentSizeCategoryL',
    scale: Number.isFinite(scale) && scale >= 0.8 && scale <= 2.2 ? scale : 1,
  }
}

function nativePlatform(capacitor) {
  try {
    return Boolean(capacitor?.isNativePlatform?.())
  } catch {
    return false
  }
}

function nativeIosPlatform(capacitor) {
  return nativePlatform(capacitor) && capacitor?.getPlatform?.() === 'ios'
}

export function createNativeAdapter(dependencies = {}) {
  const globalObject = dependencies.globalObject || globalThis
  const capacitor = dependencies.capacitor || null
  const browser = dependencies.browser || null
  const accessibility = dependencies.accessibility || null
  const calendar = dependencies.calendar || null
  const geolocation = dependencies.geolocation || null
  const localNotifications = dependencies.localNotifications || null
  const network = dependencies.network || null
  const preferences = dependencies.preferences || null
  const share = dependencies.share || null
  const fallbackValues = dependencies.fallbackValues || new Map()
  const now = dependencies.now || (() => Date.now())

  const isNativeIos = nativeIosPlatform(capacitor)

  function readFallback(key) {
    const storage = localStorageFor(globalObject)
    if (storage) return storage.getItem(key)
    return fallbackValues.get(key) || null
  }

  function writeFallback(key, value) {
    const storage = localStorageFor(globalObject)
    if (storage) {
      storage.setItem(key, value)
      return
    }
    fallbackValues.set(key, value)
  }

  function removeFallback(key) {
    const storage = localStorageFor(globalObject)
    if (storage) {
      storage.removeItem(key)
      return
    }
    fallbackValues.delete(key)
  }

  async function getPreference(key) {
    const resolvedKey = textFor(key, 'Preference key')
    if (isNativeIos && preferences?.get) {
      try {
        const result = await preferences.get({ key: resolvedKey })
        return result?.value ?? null
      } catch {
        return readFallback(resolvedKey)
      }
    }
    return readFallback(resolvedKey)
  }

  async function setPreference(key, value) {
    const resolvedKey = textFor(key, 'Preference key')
    if (typeof value !== 'string') throw new Error('Preference value must be a string.')
    if (isNativeIos && preferences?.set) {
      try {
        await preferences.set({ key: resolvedKey, value })
        return { storage: 'preferences' }
      } catch {
        writeFallback(resolvedKey, value)
        return { storage: 'fallback' }
      }
    }
    writeFallback(resolvedKey, value)
    return { storage: 'fallback' }
  }

  async function removePreference(key) {
    const resolvedKey = textFor(key, 'Preference key')
    if (isNativeIos && preferences?.remove) {
      try {
        await preferences.remove({ key: resolvedKey })
        return
      } catch {
        removeFallback(resolvedKey)
        return
      }
    }
    removeFallback(resolvedKey)
  }

  async function readJson(key, fallback = null) {
    const raw = await getPreference(key)
    if (!raw) return fallback
    try {
      return JSON.parse(raw)
    } catch {
      return fallback
    }
  }

  async function writeJson(key, value) {
    return setPreference(key, JSON.stringify(value))
  }

  async function openExternal(value) {
    const url = supportedExternalUrl(value)
    if (!url) throw new Error('Only secure external links can be opened.')
    if (isNativeIos && browser?.open) {
      await browser.open({ url, toolbarColor: '#10100f' })
      return { status: 'opened', target: 'native-browser' }
    }
    if (typeof globalObject?.open === 'function') {
      globalObject.open(url, '_blank', 'noopener,noreferrer')
      return { status: 'opened', target: 'web-browser' }
    }
    return { status: 'unavailable' }
  }

  async function getNetworkStatus() {
    if (isNativeIos && network?.getStatus) {
      try {
        return await network.getStatus()
      } catch {
        // Fall through to the browser signal, which is still useful when a
        // bridge call briefly fails while the app is restoring.
      }
    }
    const connected = globalObject?.navigator?.onLine !== false
    return { connected, connectionType: connected ? 'unknown' : 'none' }
  }

  async function subscribeNetworkStatus(callback) {
    if (typeof callback !== 'function') throw new Error('A network listener is required.')
    if (isNativeIos && network?.addListener) {
      const handle = await network.addListener('networkStatusChange', callback)
      return () => handle?.remove?.()
    }

    if (typeof globalObject?.addEventListener !== 'function') return () => {}
    const online = () => callback({ connected: true, connectionType: 'unknown' })
    const offline = () => callback({ connected: false, connectionType: 'none' })
    globalObject.addEventListener('online', online)
    globalObject.addEventListener('offline', offline)
    return () => {
      globalObject.removeEventListener('online', online)
      globalObject.removeEventListener('offline', offline)
    }
  }

  async function getTextScale() {
    if (!isNativeIos || !accessibility?.getContentSizeCategory) {
      return { category: 'UICTContentSizeCategoryL', scale: 1, source: 'default' }
    }
    try {
      return { ...normalizedTextScale(await accessibility.getContentSizeCategory()), source: 'ios' }
    } catch (error) {
      return { ...normalizedTextScale(), source: 'default', message: messageFor(error) }
    }
  }

  async function subscribeTextScale(callback) {
    if (typeof callback !== 'function') throw new Error('A text-scale listener is required.')
    if (!isNativeIos || !accessibility?.addListener) return () => {}
    try {
      const handle = await accessibility.addListener('contentSizeCategoryChange', payload => {
        callback({ ...normalizedTextScale(payload), source: 'ios' })
      })
      return () => handle?.remove?.()
    } catch {
      return () => {}
    }
  }

  async function getLocationPermission() {
    if (!isNativeIos || !geolocation?.checkPermissions) return { state: 'unavailable' }
    try {
      const permission = await geolocation.checkPermissions()
      return { state: permission?.location || 'unavailable' }
    } catch (error) {
      return { state: 'unavailable', message: messageFor(error) }
    }
  }

  async function requestCurrentLocation() {
    if (!isNativeIos || !geolocation?.checkPermissions || !geolocation?.getCurrentPosition) {
      return { status: 'unavailable' }
    }

    try {
      let permission = await geolocation.checkPermissions()
      if (permission?.location !== 'granted' && permission?.location !== 'denied' && geolocation.requestPermissions) {
        permission = await geolocation.requestPermissions({ permissions: ['location'] })
      }
      if (permission?.location !== 'granted') {
        return { status: statusForPermission(permission?.location) }
      }
      const position = await geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 300_000,
      })
      return {
        status: 'granted',
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        },
      }
    } catch (error) {
      return { status: 'unavailable', message: messageFor(error) }
    }
  }

  async function addCalendarEvent(event) {
    if (!isNativeIos || !calendar?.createEventInteractively) return { status: 'unavailable' }
    const title = textFor(event?.title, 'Calendar title')
    const startDate = timestampFor(event?.startAt ?? event?.startDate, 'Calendar start')
    const endDate = timestampFor(event?.endAt ?? event?.endDate, 'Calendar end')
    if (endDate <= startDate) throw new Error('Calendar end must be after its start.')

    const options = {
      title,
      startDate,
      endDate,
      isAllDay: false,
    }
    if (typeof event.location === 'string' && event.location.trim()) options.location = event.location.trim()
    if (typeof event.notes === 'string' && event.notes.trim()) options.notes = event.notes.trim()
    const url = supportedExternalUrl(event.url)
    if (url) options.url = url

    try {
      const result = await calendar.createEventInteractively(options)
      return { status: 'saved', eventId: result?.id || null }
    } catch (error) {
      if (error?.code === 'OS-PLUG-CLDR-0006') return { status: 'cancelled' }
      if (error?.code === 'OS-PLUG-CLDR-0020') return { status: 'denied' }
      return { status: 'unavailable', message: messageFor(error) }
    }
  }

  async function getNotificationPermission() {
    if (!isNativeIos || !localNotifications?.checkPermissions) return { state: 'unavailable' }
    try {
      const permission = await localNotifications.checkPermissions()
      return { state: permission?.display || 'unavailable' }
    } catch (error) {
      return { state: 'unavailable', message: messageFor(error) }
    }
  }

  async function scheduleLocalReminder(reminder) {
    if (!isNativeIos || !localNotifications?.schedule) return { status: 'unavailable' }
    const id = Number(reminder?.id)
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Reminder id must be a positive integer.')
    const at = new Date(timestampFor(reminder?.at, 'Reminder time'))
    if (at.getTime() <= now()) return { status: 'expired' }

    try {
      let permission = await getNotificationPermission()
      if (permission.state !== 'granted' && permission.state !== 'denied' && localNotifications.requestPermissions) {
        const requested = await localNotifications.requestPermissions()
        permission = { state: requested?.display || 'unavailable' }
      }
      if (permission.state !== 'granted') return { status: statusForPermission(permission.state) }

      const result = await localNotifications.schedule({
        notifications: [{
          id,
          title: textFor(reminder?.title, 'Reminder title'),
          body: textFor(reminder?.body, 'Reminder body'),
          schedule: { at },
          extra: reminder?.extra || {},
          threadIdentifier: 'sixpm',
        }],
      })
      return { status: 'scheduled', id: result?.notifications?.[0]?.id ?? id }
    } catch (error) {
      return { status: 'unavailable', message: messageFor(error) }
    }
  }

  async function cancelLocalReminder(id) {
    if (!isNativeIos || !localNotifications?.cancel) return { status: 'unavailable' }
    const notificationId = Number(id)
    if (!Number.isSafeInteger(notificationId) || notificationId < 1) {
      throw new Error('Reminder id must be a positive integer.')
    }
    try {
      await localNotifications.cancel({ notifications: [{ id: notificationId }] })
      return { status: 'cancelled' }
    } catch (error) {
      return { status: 'unavailable', message: messageFor(error) }
    }
  }

  async function shareContent(content) {
    const title = textFor(content?.title, 'Share title')
    const text = textFor(content?.text, 'Share text')
    const url = content?.url ? supportedExternalUrl(content.url) : null
    if (content?.url && !url) throw new Error('Only secure share links are allowed.')

    if (isNativeIos && share?.share) {
      const result = await share.share({ title, text, ...(url ? { url } : {}) })
      return { status: 'shared', activityType: result?.activityType || null }
    }
    if (typeof globalObject?.navigator?.share === 'function') {
      await globalObject.navigator.share({ title, text, ...(url ? { url } : {}) })
      return { status: 'shared' }
    }
    return { status: 'unavailable' }
  }

  return Object.freeze({
    isNativeIos,
    getPreference,
    setPreference,
    removePreference,
    readJson,
    writeJson,
    openExternal,
    getNetworkStatus,
    subscribeNetworkStatus,
    getTextScale,
    subscribeTextScale,
    getLocationPermission,
    requestCurrentLocation,
    addCalendarEvent,
    getNotificationPermission,
    scheduleLocalReminder,
    cancelLocalReminder,
    shareContent,
  })
}

export const nativeAdapter = createNativeAdapter({
  capacitor: Capacitor,
  browser: Browser,
  accessibility: SIXPMAccessibility,
  calendar: Calendar,
  geolocation: Geolocation,
  localNotifications: LocalNotifications,
  network: Network,
  preferences: Preferences,
  share: Share,
})
