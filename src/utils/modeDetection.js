/**
 * Mode detection utilities — single source of truth for
 * "what mode are we in given this URL."
 */

export function getMode(pathname) {
  if (pathname === '/roll') return 'roll'
  if (pathname.startsWith('/guide')) return 'guide'
  if (pathname.startsWith('/food')) return 'food'
  if (pathname.startsWith('/jazz')) return 'jazz'
  return 'cinema'
}

/** Guide is a sub-mode of food for layout purposes */
export function isGuideMode(pathname) {
  return pathname.startsWith('/guide')
}

/** Food mode includes guide routes */
export function isFoodMode(pathname) {
  return pathname.startsWith('/food') || pathname.startsWith('/guide')
}

export function isJazzMode(pathname) {
  return pathname.startsWith('/jazz')
}

export function isRollMode(pathname) {
  return pathname === '/roll'
}

export function isScreenshotRoute(pathname) {
  return pathname.startsWith('/day/') || pathname.startsWith('/jazz/day/')
}

