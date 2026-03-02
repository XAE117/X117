// Proximity to Louis Cole — degrees of separation
//
// inner_circle: Direct collaborators. Sam Wilkes is the obvious #1.
//   Sam Gendel and Nate Wood have played / recorded with Louis directly.
//
// the_bubble: Same LA modern-jazz / experimental underground.
//   Brainfeeder, Minaret Records, Leaving Records, International Anthem
//   orbit. Shared stages, shared sessions, shared vibes.
//
// everyone_else: Great jazz, just not in the Louis Cole cinematic universe.

export const TIERS = [
  {
    key: 'inner_circle',
    label: 'The Inner Circle',
    subtitle: 'Direct collaborators — if Louis is playing, they\'re probably on stage',
    emoji: '🤝',
  },
  {
    key: 'the_bubble',
    label: 'The Bubble',
    subtitle: 'Same scene, same rooms, same group chat',
    emoji: '🫧',
  },
  {
    key: 'everyone_else',
    label: 'Everyone Else',
    subtitle: 'Excellent jazz, just not in the Louis Cole cinematic universe',
    emoji: '🎵',
  },
]

// Keys are matched against artist names (case-insensitive, substring match).
// This lets "Sam Wilkes" match "Sam Wilkes" as well as any billing variant.
const INNER_CIRCLE = [
  'sam wilkes',
  'sam gendel',
  'nate wood',
]

const THE_BUBBLE = [
  'salami rose joe louis',
  'fievel is glauque',
  'kassa overall',
  'jeff parker',
  'dan rosenboom',
  'nicole mccabe',
  'billy mohler',
  'slauson malone',
]

export function getProximityTier(artistName) {
  const lower = artistName.toLowerCase()
  if (INNER_CIRCLE.some(name => lower.includes(name))) return 'inner_circle'
  if (THE_BUBBLE.some(name => lower.includes(name))) return 'the_bubble'
  return 'everyone_else'
}
