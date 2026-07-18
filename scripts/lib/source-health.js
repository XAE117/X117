export function summarizeSourceStatuses(sourceStatuses = []) {
  return sourceStatuses
    .map(source => `${source.name}: ${source.status}${source.error ? ` (${source.error})` : ''}`)
    .join('; ')
}

export function assertMinimumSuccessfulSources(sourceStatuses, minimum) {
  const successful = sourceStatuses.filter(source => source.status === 'ok')
  if (successful.length >= minimum) return successful

  throw new Error(
    `Only ${successful.length}/${sourceStatuses.length} live restaurant sources succeeded `
    + `(minimum ${minimum}). Existing data was preserved. `
    + summarizeSourceStatuses(sourceStatuses),
  )
}
