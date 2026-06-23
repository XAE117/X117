# SIXPM Refactor Changelog — May 2, 2026

## Dead File Cleanup (13 files deleted)

Removed 7 component/view modules and their associated CSS files that were no longer imported or routed:

| File | Reason |
|------|--------|
| `components/Header.jsx` + `.css` | Not imported anywhere — App.jsx builds top-bar inline |
| `components/Nav.jsx` + `.css` | Not imported anywhere — navigation inlined into App.jsx filter notch |
| `components/JazzQuickNav.jsx` | Not imported anywhere — superseded by unified notch nav |
| `components/SplashScreen.jsx` + `.css` | Not imported anywhere — `views/Splash.jsx` replaced it |
| `components/FormatFilter.jsx` + `.css` | Imported but never rendered — App.jsx used inline filter buttons |
| `views/Tonight.jsx` + `.css` | Not routed — replaced by ByDay view |
| `views/JazzTonight.jsx` + `.css` | Not routed — same pattern |

Also removed the stale `import FormatFilter` from App.jsx (line 6).

## App.jsx Extraction (563 → 108 lines)

Decomposed the god component into focused modules:

### New hooks (`src/hooks/`)
- **`useAppData.js`** — All data fetching + restaurant normalization logic
- **`useCinemaFilter.js`** — Cinema data filtering with `useMemo` optimization (was recalculating every render)
- **`useScrollBehavior.js`** — Scroll-to-top on route change + scroll-idle detection
- **`usePageTitle.js`** — Dynamic document.title per mode

### New components
- **`components/TopBar.jsx`** — The entire top-bar UI (216 lines of JSX extracted). Manages its own `vibeOpen`, `vibeRef`, `filtersExpanded`, `foodDropdown` state internally. Nav configs extracted to module-level constants.
- **`components/AppRoutes.jsx`** — All route definitions. Includes the `SmartCinemaDefault` wrapper.

### New utilities
- **`utils/modeDetection.js`** — `getMode()`, `isScreenshotRoute()`, `isDetailRoute()`, `isJazzMode()`, `isFoodMode()`, `isGuideMode()`, `isRollMode()` — single source of truth for URL → mode mapping

## Optimization Notes
- `getFilteredData` was recalculating on every render. Now wrapped in `useMemo([data, formatFilter])` inside `useCinemaFilter`.
- TopBar nav configs (jazz/food/cinema links, format filters, vibes options) are now module-level constants instead of being recreated in JSX on each render.
- `filtersExpanded`, `foodDropdown`, `vibeOpen`, `vibeRef` state moved from App into TopBar where they belong.

## Build Verification
- `vite build` passes clean — 132 modules transformed, 0 errors
