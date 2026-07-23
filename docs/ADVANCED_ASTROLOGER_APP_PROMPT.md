# Build Prompt: Personal Astrologer Workstation

Build a private, desktop-first astrology application called **ORBITAL MIRROR** for
James Walker. It must be an actual daily-use analytical instrument, not a generic
horoscope landing page.

## Personal Baseline

- Name: James Walker
- Birth: May 1, 1985 at 6:27 PM local time
- Place: Eugene, Oregon, USA
- Current home/time zone: Central Los Angeles, America/Los_Angeles
- Practice frame: astrology and chaos magick are temporary symbolic lenses for
  reflection and timing, not fixed beliefs or empirical authorities
- Neurotype and capacity: autistic + ADHD, with variable Long COVID/Lyme
  capacity; reduce initiation friction and never use shame, streak pressure, or
  willpower language

## Product Job

On refresh, calculate and explain the most relevant personal astrological
conditions for today, this week, this month, and a user-selected date. Translate
them into clear reflective questions, timing windows, and bounded experiments.
Never present fate, certainty, diagnosis, or instructions that override health,
financial, legal, relationship, recovery, or safety judgment.

## Calculation Requirements

Use Swiss Ephemeris or an equivalently validated ephemeris for deterministic
calculations. Keep the calculation engine separate from AI interpretation.
Handle historical daylight-saving time, coordinates, time zones, precession,
house system selection, and retrograde/station timing explicitly.

Calculate and expose:

- Tropical natal chart with planets, angles, houses, nodes, Chiron, and Part of
  Fortune; default to Placidus with Whole Sign as a comparison mode
- Current transits to natal planets and angles with configurable orbs
- Secondary progressions, solar arc directions, solar return, lunar return, and
  annual profections
- Lunations, eclipses, stations, ingresses, void-of-course Moon, and exact aspect
  windows
- Dignities, receptions, house rulerships, aspect applying/separating state, and
  confidence/source metadata
- A provenance panel listing ephemeris version, calculation time, coordinates,
  time-zone conversion, house system, and every interpretive rule used

## Interpretation Model

Generate interpretation only from a structured calculation payload. For every
claim, show the exact transit, natal target, orb, applying/separating state, and
active date window. Separate the output into:

1. **Calculated sky**: astronomy and chart facts only
2. **Traditional interpretation**: attributed school/rule
3. **Reflective lens**: questions and possible themes
4. **Operational experiment**: one small reversible action
5. **Reality check**: what would disconfirm the interpretation

Use warm, direct language without pseudo-therapy. The app may offer emotional
reflection but must not diagnose, treat, predict crises, or simulate a licensed
clinician.

## Personal Context Integration

Add private connectors for:

- Notion pages containing Susan Miller forecasts and James's Operations Room
- Heartbeat project priorities and current decision gates
- Toggl time allocation
- Momentum Streaks completion history
- Morning Console body signals, keeping cognitive activation and physiological
  capacity as separate variables
- Optional calendar events and manually entered journal observations

The astrology engine may color timing and reflection, but observed capacity,
deadlines, money gravity, and real commitments remain higher-priority inputs.

## Core Views

- **Today**: strongest three transits, Moon condition, exact windows, one
  reflective prompt, and one bounded action
- **Timeline**: zoomable 90-day aspect and ingress track with filters
- **Natal**: interactive chart wheel plus aspect table and source-aware
  interpretation
- **Cycles**: returns, progressions, profections, eclipses, and stations
- **Pattern Lab**: compare prior forecasts with journaled outcomes; calculate hit
  rates and confirmation bias indicators
- **Source Desk**: imported Susan Miller text beside calculated chart facts,
  clearly identifying agreements, conflicts, and unsupported assertions

## Design

Use a quiet, compact observatory-console aesthetic: near-black graphite,
desaturated mineral green, restrained amber, fine grid lines, precise typography,
and one accurate interactive chart wheel. Avoid purple gradients, glowing
fortune-teller clichés, oversized cards, decorative orbs, or mystical stock art.
The first viewport must be the working Today view.

## Privacy and Reliability

Keep birth data and journals private. Store integration secrets server-side.
Encrypt persistent sensitive data. Add explicit source status, stale-data labels,
offline cache, loading/error/empty states, export/delete controls, and unit tests
for time-zone conversion, aspect orbs, house cusps, retrograde detection, and
date-window boundaries.

Deliver a production-ready repository, setup documentation, tests, a deployed
private preview, and a desktop-installable version. Do not claim completion until
the natal chart has been cross-checked against a trusted reference chart and the
same-date transit output matches the ephemeris within documented tolerances.
