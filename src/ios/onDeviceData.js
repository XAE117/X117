function hasLocalReminder(evening) {
  return Number.isSafeInteger(evening?.reminder?.notificationId)
}

/**
 * Removes the local SIXPM records we own while deliberately leaving user-owned
 * Calendar events alone. Reminder cancellation is best-effort: the data erase
 * must still complete if iOS cannot confirm removal of a scheduled reminder.
 */
export async function eraseSIXPMOnDeviceData({
  evenings = [],
  cancelReminder,
  clearSavedEvenings,
  clearOfflineCatalog,
} = {}) {
  const reminderResults = await Promise.all(evenings
    .filter(hasLocalReminder)
    .map(async evening => {
      try {
        await cancelReminder(evening)
        return true
      } catch {
        return false
      }
    }))
  const [savedResult, catalogResult] = await Promise.allSettled([
    clearSavedEvenings(),
    clearOfflineCatalog(),
  ])

  return {
    savedEveningsCleared: savedResult.status === 'fulfilled',
    offlineCatalogCleared: catalogResult.status === 'fulfilled',
    unresolvedReminderCount: reminderResults.filter(result => !result).length,
  }
}
