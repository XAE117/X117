import { describe, expect, it, vi } from 'vitest'
import { createNativeAdapter } from '../../src/ios/native/nativeAdapter.js'

function iosDependencies(overrides = {}) {
  return {
    capacitor: {
      isNativePlatform: () => true,
      getPlatform: () => 'ios',
    },
    browser: { open: vi.fn() },
    calendar: { createEventInteractively: vi.fn() },
    geolocation: {
      checkPermissions: vi.fn(),
      requestPermissions: vi.fn(),
      getCurrentPosition: vi.fn(),
    },
    localNotifications: {
      checkPermissions: vi.fn(),
      requestPermissions: vi.fn(),
      schedule: vi.fn(),
      cancel: vi.fn(),
    },
    network: {
      getStatus: vi.fn(),
      addListener: vi.fn(),
    },
    preferences: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    share: { share: vi.fn() },
    ...overrides,
  }
}

describe('SIXPM native adapter', () => {
  it('stores JSON through native Preferences and falls back safely in web previews', async () => {
    const preferences = {
      get: vi.fn().mockResolvedValue({ value: '{"saved":true}' }),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    }
    const native = createNativeAdapter(iosDependencies({ preferences }))

    await expect(native.writeJson('sixpm.fixture', { saved: true })).resolves.toEqual({ storage: 'preferences' })
    await expect(native.readJson('sixpm.fixture')).resolves.toEqual({ saved: true })
    expect(preferences.set).toHaveBeenCalledWith({ key: 'sixpm.fixture', value: '{"saved":true}' })

    const fallback = new Map()
    const web = createNativeAdapter({ globalObject: {}, fallbackValues: fallback })
    await web.writeJson('sixpm.fixture', { saved: true })
    await expect(web.readJson('sixpm.fixture')).resolves.toEqual({ saved: true })
  })

  it('opens only secure external URLs with the native browser', async () => {
    const browser = { open: vi.fn().mockResolvedValue(undefined) }
    const native = createNativeAdapter(iosDependencies({ browser }))

    await expect(native.openExternal('https://www.amctheatres.com/showtimes')).resolves.toEqual({
      status: 'opened',
      target: 'native-browser',
    })
    expect(browser.open).toHaveBeenCalledWith({
      url: 'https://www.amctheatres.com/showtimes',
      toolbarColor: '#10100f',
    })
    await expect(native.openExternal('http://example.test')).rejects.toThrow('Only secure external links')
  })

  it('does not re-prompt after location permission is denied', async () => {
    const geolocation = {
      checkPermissions: vi.fn().mockResolvedValue({ location: 'denied' }),
      requestPermissions: vi.fn(),
      getCurrentPosition: vi.fn(),
    }
    const native = createNativeAdapter(iosDependencies({ geolocation }))

    await expect(native.requestCurrentLocation()).resolves.toEqual({ status: 'denied' })
    expect(geolocation.requestPermissions).not.toHaveBeenCalled()
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })

  it('uses the system calendar editor rather than silently reading the calendar', async () => {
    const calendar = {
      createEventInteractively: vi.fn().mockResolvedValue({ id: 'event-123' }),
    }
    const native = createNativeAdapter(iosDependencies({ calendar }))

    await expect(native.addCalendarEvent({
      title: 'SIXPM · Film + dinner',
      startAt: '2026-08-18T19:00:00-07:00',
      endAt: '2026-08-18T22:00:00-07:00',
      location: 'AMC Century City',
      notes: 'A saved SIXPM evening.',
      url: 'https://www.amctheatres.com/',
    })).resolves.toEqual({ status: 'saved', eventId: 'event-123' })

    expect(calendar.createEventInteractively).toHaveBeenCalledWith(expect.objectContaining({
      title: 'SIXPM · Film + dinner',
      location: 'AMC Century City',
      url: 'https://www.amctheatres.com/',
      isAllDay: false,
    }))
  })

  it('does not re-prompt after local reminders are denied and schedules only future reminders', async () => {
    const localNotifications = {
      checkPermissions: vi.fn().mockResolvedValue({ display: 'denied' }),
      requestPermissions: vi.fn(),
      schedule: vi.fn(),
      cancel: vi.fn(),
    }
    const native = createNativeAdapter(iosDependencies({
      localNotifications,
      now: () => new Date('2026-08-18T12:00:00-07:00').getTime(),
    }))

    await expect(native.scheduleLocalReminder({
      id: 41,
      title: 'SIXPM tonight',
      body: 'Leave soon.',
      at: '2026-08-18T18:00:00-07:00',
    })).resolves.toEqual({ status: 'denied' })
    expect(localNotifications.requestPermissions).not.toHaveBeenCalled()
    expect(localNotifications.schedule).not.toHaveBeenCalled()
  })

  it('requests notification permission only from the reminder action and schedules a future notification', async () => {
    const localNotifications = {
      checkPermissions: vi.fn().mockResolvedValue({ display: 'prompt' }),
      requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
      schedule: vi.fn().mockResolvedValue({ notifications: [{ id: 41 }] }),
      cancel: vi.fn(),
    }
    const native = createNativeAdapter(iosDependencies({
      localNotifications,
      now: () => new Date('2026-08-18T12:00:00-07:00').getTime(),
    }))

    await expect(native.scheduleLocalReminder({
      id: 41,
      title: 'SIXPM tonight',
      body: 'Leave soon.',
      at: '2026-08-18T18:00:00-07:00',
      extra: { eveningId: 'saved-1' },
    })).resolves.toEqual({ status: 'scheduled', id: 41 })
    expect(localNotifications.requestPermissions).toHaveBeenCalledTimes(1)
    expect(localNotifications.schedule).toHaveBeenCalledWith(expect.objectContaining({
      notifications: [expect.objectContaining({
        id: 41,
        title: 'SIXPM tonight',
        body: 'Leave soon.',
        threadIdentifier: 'sixpm',
      })],
    }))
  })
})
