# SIXPM V1 Screenshot Capture Plan

**State:** capture is blocked until the reviewed release build can reach the
public, verified catalog. Do not use browser screenshots, mocked provider
content, a private local endpoint, a generic card redesign, or a build that
will not be submitted.

## Required visual direction

The screenshots must show the restored SIXPM language:

- black/brown textured field surface;
- gold hairlines, double rules, and diamond dividers;
- large cream/gold serif typography and compact field labels;
- dense cinema listings, colored venue labels, showtime/format markers, and
  the bottom **SIXPM field index**.

They must not lead with a generic dashboard card, faux AI itinerary, rounded
SaaS tile system, empty loading state, or a provider/data state that a clean
review install cannot reproduce.

## Capture gate

Before capturing any candidate image:

1. The release build has been synced to a 6.9-inch iPhone Simulator from the
   same commit intended for archive.
2. `https://sixpm.vercel.app/catalog/v1/index.json` returns the expected JSON
   with a valid, current rights-gated feed—not HTML, a redirect, or Vercel SSO.
3. The simulator has a clean app container, no personal location, no personal
   Calendar data, and no saved evening unless that state is deliberately shown.
4. A human visually confirms safe areas, status bar treatment, type hierarchy,
   live catalog freshness, and original editorial character at native pixels.

## Five-image sequence

| File | Screen | What it communicates |
| --- | --- | --- |
| `01-directory.png` | Tonight / compact AMC program under the masthead | SIXPM’s distinct editorial directory, not another recommendation-card app. |
| `02-showtimes.png` | A dense grouped film listing with theater label and format/time markers | Current cinema information stays legible and tactile. |
| `03-evening-pair.png` | Film + dinner selected together before saving | One specific evening can be held together without an account. |
| `04-saved-evening.png` | A saved whole evening with the local actions visible | The app has a useful offline/local continuity loop. |
| `05-app-notes.png` | Notes with the source/privacy/support and local-data controls | The product is deliberately private, bounded, and clear about its limits. |

Use real approved catalog data only. If a time-sensitive listing no longer
exists, recreate the same type of screen from the current verified catalog;
never retain an expired provider screenshot just because it looks better.

## File requirements and validation

Apple currently accepts 6.9-inch iPhone portrait screenshots at one of these
native sizes: `1260 x 2736`, `1290 x 2796`, or `1320 x 2868` pixels, depending
on the device. Capture all five from one documented 6.9-inch simulator/device
configuration and retain the original PNG files. Apple accepts one to ten
screenshots per platform in PNG/JPEG/JPG; files must not contain alpha.

Record the model, runtime, resolution, build SHA, catalog timestamp, and source
file checksum in `docs/app-store/screenshots/README.md` when capture begins.
Before upload, inspect each file with:

```sh
sips -g pixelWidth -g pixelHeight -g format -g hasAlpha path/to/image.png
```

The final human pass must confirm that text is readable at native scale, no
private identifiers or personal location are visible, all capture screens are
available in the submitted build, and the first image immediately reads as the
restored SIXPM—not a generic nightlife app.

## Current Apple reference

- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Upload app previews and screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots)
