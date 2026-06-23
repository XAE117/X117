# SIXPM App.jsx Refactor Plan

**Date:** April 29, 2026
**Scope:** Break the 563-line god component into focused modules
**Goal:** Each file owns one concern. App.jsx becomes a thin shell: provider setup, route table, layout.

---

## Current Pain Points

App.jsx currently owns all of the following, which should each live in its own module:

1. **Data fetching & normalization** (lines 145–201) — fetch logic, restaurant field normalization, category generation
2. **Cinema filtering** (lines 207–248) — format filter, favorites filter, new release filter, date pruning
3. **Scroll behavior** (lines 89–106) — scroll-to-top on route change, scroll-idle detection
4. **UI state** — filter expansion, food dropdown, search query, vibe picker, splash gate
5. **Page title management** (lines 131–143) — mode-aware document.title
6. **The entire top-bar** (lines 288–504) — guide section nav, vibes pill, filter notch with three mode-specific nav menus, format filters, search input
7. **Route definitions** (lines 508–550) — all cinema/jazz/food/guide/roll routes
8. **Mode detection** (lines 83–86) — deriving cinema/jazz/food/guide/roll from pathname

---

## Dead Code & Unused Components

| File | Status | Action |
|------|--------|--------|
| `components/Header.jsx` + `.css` | **Not imported anywhere** — App.jsx builds its own top-bar inline | Delete |
| `components/Nav.jsx` + `.css` | **Not imported anywhere** — navigation was inlined into App.jsx's filter notch | Delete |
| `components/JazzQuickNav.jsx` | **Not imported anywhere** — superseded by the unified notch nav | Delete |
| `components/SplashScreen.jsx` + `.css` | **Not imported anywhere** — `views/Splash.jsx` replaced it | Delete |
| `components/FormatFilter.jsx` + `.css` | **Imported but never rendered** — App.jsx imports it (line 6) but the JSX uses inline filter buttons instead | Remove import; delete files |
| `views/Tonight.jsx` + `.css` | Not routed — appears to be an earlier "tonight" view replaced by ByDay | Verify, then delete |
| `views/JazzTonight.jsx` + `.css` | Not routed — same pattern | Verify, then delete |

That's **7 component files + 7 CSS files = 14 files** to remove. Clean cut, no downstream breakage.

---

## Extraction Plan — File by File

### 1. `src/hooks/useAppData.js` — Data Fetching & Normalization

Extract from App.jsx lines 145–206.

```
Exports:
  useAppData() → { data, jazzData, foodData, guideData, loading, refreshing, fetchData }
```

Moves the entire `fetchData` function and the restaurant normalization logic (tier/category bridging, TIER_COLORS, default categories array) into a custom hook. App.jsx calls it once and destructures.

**Why separate:** The restaurant normalization alone is 30 lines of domain logic that has zero business being in the shell component. This is the kind of thing that'll grow as you add more data sources.

### 2. `src/hooks/useCinemaFilter.js` — Cinema Data Filtering

Extract from App.jsx lines 38–49 (constants) and 207–248 (getFilteredData).

```
Exports:
  useCinemaFilter(data, formatFilter) → filteredData
  FILM_FORMATS, NEW_RELEASE_MIN_YEAR, FAVORITE_THEATERS (constants)
```

Pure derivation — takes raw cinema data + active filter key, returns filtered data. Currently recalculates on every render; wrapping in `useMemo` here is the natural place to add that optimization.

### 3. `src/hooks/useScrollBehavior.js` — Scroll Effects

Extract from App.jsx lines 89–106.

```
Exports:
  useScrollBehavior() → { isScrolling }
```

Two effects: scroll-to-top on route change, and scroll-idle detection for fading UI elements. Tiny hook, but it removes two `useEffect` calls and a `useState` from App.

### 4. `src/hooks/usePageTitle.js` — Dynamic Document Title

Extract from App.jsx lines 131–143.

```
Exports:
  usePageTitle(mode)
```

Five-line effect. Trivial to extract, removes one more concern from App.

### 5. `src/components/TopBar.jsx` + `TopBar.css` — The Big One

Extract from App.jsx lines 288–504. This is **216 lines of JSX** — nearly 40% of App.jsx.

```
Props:
  mode: 'cinema' | 'jazz' | 'food' | 'guide' | 'roll'
  formatFilter, setFormatFilter
  searchQuery, setSearchQuery
  filtersExpanded, setFiltersExpanded
  refreshing, onRefresh
  vibe, setVibe
```

The TopBar internally manages its own `vibeOpen`, `vibeRef`, and `foodDropdown` state (those don't need to live in App at all). It renders:

- **Guide section nav** (guide mode only)
- **Vibes pill** (roll mode only)
- **Filter notch** (cinema/jazz/food) with:
  - Collapsed quick-access buttons
  - Expanded mode-specific NavLink menus
  - Format filters + search (cinema only)
- **Dice pill** link to /roll
- **ModeSwitcher**

The three mode-specific nav configs (jazz links, food links, cinema links) should be constants inside TopBar or a small `navConfig.js`.

#### Sub-extraction option (phase 2):
If TopBar itself feels too big after extraction, the filter notch expanded panel could become `<FilterNotchPanel mode={mode} ... />`. But do the first extraction before fragmenting further — premature decomposition is as bad as a god component.

### 6. `src/components/AppRoutes.jsx` — Route Table

Extract from App.jsx lines 508–550.

```
Props:
  data, filteredData, jazzData, foodData, guideData, searchQuery, vibe, setVibe
```

Purely declarative — just the `<Routes>` block. Makes the route table scannable in isolation and keeps App.jsx focused on layout.

### 7. `src/utils/modeDetection.js` — Mode Helpers

Extract from App.jsx lines 83–86 and line 276.

```
Exports:
  getMode(pathname) → 'cinema' | 'jazz' | 'food' | 'guide' | 'roll'
  isDetailRoute(pathname) → boolean
  isScreenshotRoute(pathname) → boolean
```

Used by TopBar, AppRoutes, usePageTitle, and the conditional rendering logic. Single source of truth for "what mode are we in given this URL."

---

## Refactored App.jsx — Target Shape

After extraction, App.jsx should be roughly **60–80 lines**:

```jsx
import { useState } from 'react'
import { useLocation, Routes, Route } from 'react-router-dom'
import { useAppData } from './hooks/useAppData'
import { useCinemaFilter } from './hooks/useCinemaFilter'
import { useScrollBehavior } from './hooks/useScrollBehavior'
import { usePageTitle } from './hooks/usePageTitle'
import { getMode, isScreenshotRoute, isDetailRoute } from './utils/modeDetection'
import TopBar from './components/TopBar'
import AppRoutes from './components/AppRoutes'
import GodfatherAlert from './components/GodfatherAlert'
import BackPill from './components/BackPill'
import Footer from './components/Footer'
import LoadingSpinner from './components/LoadingSpinner'
import Splash from './views/Splash'
import DayScreenshot from './views/DayScreenshot'
import JazzDayScreenshot from './views/JazzDayScreenshot'

function App() {
  const location = useLocation()
  const mode = getMode(location.pathname)
  const { data, jazzData, foodData, guideData, loading, refreshing, fetchData } = useAppData()
  const [formatFilter, setFormatFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [vibe, setVibe] = useState('all')
  const [splashSeen, setSplashSeen] = useState(/* ... */)
  const { isScrolling } = useScrollBehavior()
  const filteredData = useCinemaFilter(data, formatFilter)
  usePageTitle(mode)

  if (loading) return <LoadingSpinner />
  if (!data) return <ErrorState />
  if (isScreenshotRoute(location.pathname)) return <ScreenshotRoutes ... />

  return (
    <div className={`app ${mode}-mode ${isScrolling ? 'ui-scrolling' : ''}`}>
      {!splashSeen && <Splash onEnter={() => setSplashSeen(true)} />}
      {!isDetail && <TopBar ... />}
      {!isDetail && mode === 'cinema' && <GodfatherAlert data={data} />}
      <main className="main-content">
        <AppRoutes ... />
      </main>
      <Footer ... />
      {showBackPill && <BackPill />}
    </div>
  )
}
```

Clean, scannable, each concern traceable to its module.

---

## CSS Extraction

`App.css` (724 lines) should be split in parallel:

| New file | Styles to move |
|----------|---------------|
| `TopBar.css` | `.top-bar`, `.filter-notch*`, `.notch-*`, `.vibes-*`, `.guide-section-*`, `.dice-pill`, `.expanded-search-*` |
| `App.css` (remaining) | `.app`, `.main-content`, `.error-state`, mode class modifiers, `ui-scrolling` transitions |

The format filter styles in `FormatFilter.css` can be deleted since that component is dead.

---

## Execution Order

Do these in order — each step is independently shippable and testable:

1. **Delete dead files** (Header, Nav, JazzQuickNav, SplashScreen, FormatFilter, Tonight, JazzTonight) — zero risk, instant cleanup
2. **Extract `modeDetection.js`** — pure functions, no state, easy to test
3. **Extract `useAppData`** — isolates the fetch/normalize cycle
4. **Extract `useCinemaFilter`** — add `useMemo` while you're at it
5. **Extract `useScrollBehavior` + `usePageTitle`** — small wins
6. **Extract `TopBar`** — the big move, but by now App.jsx is already much simpler to work in
7. **Extract `AppRoutes`** — mechanical move
8. **Split `App.css`** — do last, after JSX is stable

Each step: extract → verify dev server renders → commit. Don't batch.

---

## Optimization Opportunities

- **`getFilteredData` runs on every render.** Wrap in `useMemo([data, formatFilter])` during step 4.
- **Restaurant normalization mutates in place** (`food.restaurants.forEach(r => { r.tier = ... })`). Should return a new array to avoid subtle bugs if React re-renders with stale closures.
- **`fetchData` as dependency.** It's defined inside the component, recreated every render, but used in an effect. Should be wrapped in `useCallback` or moved into the hook.
- **Session storage splash check** runs on every `useState` init. Fine, but the `try/catch` suggests awareness of SSR — worth a comment or extracting to a util.
