import { describe, expect, it } from 'vitest'
import { eraseSIXPMOnDeviceData } from '../../src/ios/onDeviceData.js'

describe('on-device SIXPM data deletion', () => {
  it('clears saved evenings and the offline catalog after cancelling owned reminders', async () => {
    const calls = []
    const result = await eraseSIXPMOnDeviceData({
      evenings: [
        { id: 'with-reminder', reminder: { notificationId: 12 } },
        { id: 'without-reminder', reminder: null },
      ],
      cancelReminder: async evening => { calls.push(`reminder:${evening.id}`) },
      clearSavedEvenings: async () => { calls.push('saved') },
      clearOfflineCatalog: async () => { calls.push('catalog') },
    })

    expect(calls).toEqual(['reminder:with-reminder', 'saved', 'catalog'])
    expect(result).toEqual({
      savedEveningsCleared: true,
      offlineCatalogCleared: true,
      unresolvedReminderCount: 0,
    })
  })

  it('still erases the local records when iOS cannot confirm a reminder cancellation', async () => {
    const calls = []
    const result = await eraseSIXPMOnDeviceData({
      evenings: [{ id: 'reminder', reminder: { notificationId: 9 } }],
      cancelReminder: async () => { throw new Error('Notification service unavailable') },
      clearSavedEvenings: async () => { calls.push('saved') },
      clearOfflineCatalog: async () => { calls.push('catalog') },
    })

    expect(calls).toEqual(['saved', 'catalog'])
    expect(result).toEqual({
      savedEveningsCleared: true,
      offlineCatalogCleared: true,
      unresolvedReminderCount: 1,
    })
  })

  it('reports an incomplete erase without skipping the other local store', async () => {
    const calls = []
    const result = await eraseSIXPMOnDeviceData({
      clearSavedEvenings: async () => { throw new Error('Preferences write failed') },
      clearOfflineCatalog: async () => { calls.push('catalog') },
      cancelReminder: async () => {},
    })

    expect(calls).toEqual(['catalog'])
    expect(result).toEqual({
      savedEveningsCleared: false,
      offlineCatalogCleared: true,
      unresolvedReminderCount: 0,
    })
  })
})
