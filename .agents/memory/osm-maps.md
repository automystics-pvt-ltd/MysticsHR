---
name: OSM iframe maps
description: How embedded location maps are implemented in MysticsHR — no packages, no API keys
---

`LocationMap` component in `artifacts/mysticshr/src/components/ui/LocationMap.tsx` uses an OpenStreetMap iframe embed.

URL pattern:
```
https://www.openstreetmap.org/export/embed.html?bbox={lon-d},{lat-d},{lon+d},{lat+d}&layer=mapnik&marker={lat},{lon}
```
where `d = 0.008` (zoom level).

**Why:** Avoids Leaflet/Mapbox packages, API keys, and npm install overhead. The iframe approach works in production without any server-side configuration.

**How to apply:** Import `LocationMap` and pass `latitude`, `longitude` (string or number), optional `accuracy` (meters), `label` (header text), and `height` (px, default 180). Component returns null if coords are missing/invalid.

Also renders a "Open in Maps ↗" link to Google Maps for the raw coordinates.
