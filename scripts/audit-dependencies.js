#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const SEVERITY = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
}

const MINIMUM_BLOCKING_SEVERITY = SEVERITY.high

// This advisory affects only unstable React Server Component APIs. SIXPM is a
// client-rendered Vite SPA using BrowserRouter and has no RSC entry points or
// server actions. Remove this exception when a patched v7 release is available
// or when the app migrates to the v8 `react-router` package.
const ADVISORY_EXCEPTIONS = new Map([
  ['GHSA-QWWW-VCR4-C8H2', {
    expires: '2026-10-01',
    reason: 'Not applicable: SIXPM does not use React Router unstable RSC APIs.',
  }],
])

function advisoryId(finding) {
  return String(finding?.url || '').match(/GHSA-[a-z0-9-]+/i)?.[0]?.toUpperCase() || null
}

function collectFindings(vulnerabilities, name, seen = new Set()) {
  if (seen.has(name)) return []
  seen.add(name)

  const vulnerability = vulnerabilities[name]
  if (!vulnerability) return []

  return (vulnerability.via || []).flatMap(via => {
    if (typeof via === 'string') {
      return collectFindings(vulnerabilities, via, seen)
    }

    return [{
      id: advisoryId(via),
      severity: via.severity || vulnerability.severity,
      title: via.title || name,
      url: via.url || '',
    }]
  })
}

function isActiveException(finding, today) {
  if (!finding.id) return false
  const exception = ADVISORY_EXCEPTIONS.get(finding.id)
  return Boolean(exception && exception.expires >= today)
}

function runAudit() {
  const result = spawnSync('npm', ['audit', '--json'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })

  if (result.error) throw result.error

  let report
  try {
    report = JSON.parse(result.stdout)
  } catch {
    console.error(result.stderr || result.stdout || 'npm audit returned unreadable output.')
    process.exit(1)
  }

  if (report.error || !report.metadata?.vulnerabilities) {
    console.error(report.error?.summary || report.error?.message || 'npm audit did not return a vulnerability report.')
    process.exit(1)
  }

  const vulnerabilities = report.vulnerabilities || {}
  const today = new Date().toISOString().slice(0, 10)
  const blocked = []
  const excepted = []

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if ((SEVERITY[vulnerability.severity] ?? MINIMUM_BLOCKING_SEVERITY) < MINIMUM_BLOCKING_SEVERITY) {
      continue
    }

    const findings = collectFindings(vulnerabilities, name)
    const unapproved = findings.filter(finding => !isActiveException(finding, today))

    if (findings.length === 0 || unapproved.length > 0) {
      blocked.push({ name, severity: vulnerability.severity, findings: unapproved })
    } else {
      excepted.push({ name, findings })
    }
  }

  if (blocked.length > 0) {
    console.error('Dependency audit failed with unapproved high or critical findings:')
    for (const item of blocked) {
      const details = item.findings.length > 0
        ? item.findings.map(finding => finding.id || finding.title).join(', ')
        : 'unresolved advisory chain'
      console.error(`  - ${item.name} (${item.severity}): ${details}`)
    }
    process.exit(1)
  }

  console.log('Dependency audit passed: no unapproved high or critical findings.')
  const reportedExceptions = new Set()
  for (const item of excepted) {
    for (const finding of item.findings) {
      if (reportedExceptions.has(finding.id)) continue
      reportedExceptions.add(finding.id)
      const exception = ADVISORY_EXCEPTIONS.get(finding.id)
      console.log(`  - ${finding.id} excepted through ${exception.expires}: ${exception.reason}`)
    }
  }
}

runAudit()
