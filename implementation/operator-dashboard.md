# Operator Dashboard — Implementation Plan

---

## Overview

The operator dashboard is a web interface built with React + Vite + Leaflet.
It allows an operator to monitor live alerts, view alert details, find nearby
responders, and dispatch them to incident sites.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React + Vite |
| Maps | Leaflet + react-leaflet |
| Styling | Tailwind CSS |
| Routing | react-router-dom |
| Data Fetching | Polling (every 5 seconds) |
| Auth | FIDO2 Passkeys via @simplewebauthn/browser (deferred) |
| Hosting | Vercel |

---

## Design System

Matches the existing Jakada mobile app aesthetic.

```css
--color-base-black:   #060a07
--color-base-surface: #0a0e0b
--color-base-card:    #111613
--color-signal:        #00ff64
--color-signal-dim:    rgba(0, 255, 100, 0.5)
--color-signal-muted:  rgba(0, 255, 100, 0.1)
--color-signal-border: rgba(0, 255, 100, 0.25)
--color-threat:        #ffb800
--color-danger:        #ff3b3b
--font-mono:           "Share Tech Mono", monospace
```

### Alert Status Colors

| Status | Color |
|---|---|
| active | #ff3b3b (red) |
| pending | #ffb800 (amber) |
| dispatched | #378ADD (blue) |
| resolved | #00ff64 (green) |
| ignored | rgba(0,255,100,0.2) (dim) |

---

## Screen Structure

```
/login      → Operator login (passkey — deferred)
/register   → Operator registration (passkey — deferred)
/dashboard  → Main dashboard (map + alert feed)
```

### Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  JAKADA — COMMAND DASHBOARD          ● 2 ACTIVE    LOGOUT   │ ← Top bar
├──────────────────┬──────────────────────────────────────────┤
│  LIVE ALERT FEED │                                          │
│  ─────────────── │           LEAFLET MAP                    │
│  [ALERT CARD]    │                                          │
│  [ALERT CARD]    │    ● red = active alert                  │
│  [ALERT CARD]    │    ● yellow = nearby responder           │
│                  │    ● blue = dispatched alert             │
│                  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### Alert Detail Modal

```
┌─────────────────────────────────────────────────────────────┐
│                    ALERT DETAIL                        [X]  │
│  ─────────────────────────────────────────────────────────  │
│  STATUS: ACTIVE          TRIGGERED: 5 mins ago              │
│  LOCATION: 9.2182, 9.5179                                   │
│  LEGITIMACY: ████████░░ 80%                                 │
│                                                             │
│  CIVILIAN                                                   │
│  Username: john_doe    Phone: +234801234567                 │
│                                                             │
│  CROWD RESPONSES (3)                                        │
│  ✓ Yes   ✓ Yes   ✗ No                                       │
│                                                             │
│  NEARBY RESPONDERS              [ASSIGN ALL]                │
│  ─────────────────────────────────────────                  │
│  officer_mike    1.2km   [ASSIGN]                           │
│  officer_sara    2.4km   [ASSIGN]                           │
│  officer_james   3.1km   [ASSIGN]                           │
│                                                             │
│                        [LOAD MORE RESPONDERS]               │
│                                                             │
│  [RESOLVE]  [IGNORE]                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

---

### Phase 1 — Base Dashboard + Map

**Goal:** Dashboard loads, map renders, alerts are polled and markers appear.

#### What We Build

- DashboardScreen with two panels (alert feed left, map right)
- Leaflet map centered on Plateau State, Nigeria (lat: 9.2182, lng: 9.5179)
- Dark map tiles from CartoDB Dark Matter
- Poll GET /alerts every 5 seconds
- Red circular div markers for active/dispatched alerts on the map
- Alert cards in the left feed showing: status badge, time, legitimacy score
- Top bar with active alert count and logout button

#### Files

```
src/
├── components/
│   └── dashboard-screen.tsx    ← new
├── api/
│   └── alerts.ts               ← new
└── App.tsx                     ← updated with /dashboard route
```

#### Alert Card Design

Each card in the left panel shows:
- Status badge (color coded)
- Time triggered (e.g. "5m ago")
- Coordinates (lat, lng)
- Legitimacy score bar

Clicking a card opens the Alert Detail Modal (Phase 3).

#### Map Marker Design

- Active alert: red glowing circle (14px, box-shadow red glow)
- Dispatched alert: blue glowing circle
- Clicking a marker opens the Alert Detail Modal (Phase 3)

#### Test Checklist

- [ ] Navigate to /dashboard — page loads without errors
- [ ] Map renders centered on Plateau State
- [ ] Trigger panic from mobile app
- [ ] Within 5 seconds alert card appears in left feed
- [ ] Within 5 seconds red marker appears on map at correct coordinates

---

### Phase 2 — Alert Sound

**Goal:** Sound plays when there are unattended alerts, stops when all
are dispatched or resolved.

#### What We Build

- Load an alert audio file (looping) from public/alert.mp3
- Sound starts playing when any alert has status active or pending
- Sound keeps playing if multiple alerts are unattended simultaneously
- Sound does not restart if already playing when new alert comes in
- Sound stops only when all active/pending alerts are dispatched or resolved

#### Sound Logic

```
On every poll result:
  unattended = alerts where status is active or pending
  if unattended.length > 0 and sound is not playing:
    sound.play()
    sound.loop = true
  if unattended.length === 0 and sound is playing:
    sound.pause()
    sound.currentTime = 0
```

#### Files

```
public/
└── alert.mp3                   ← audio file (add manually)
src/
└── components/
    └── dashboard-screen.tsx    ← updated with sound logic
```

#### Test Checklist

- [ ] Trigger alert from mobile app — sound plays within 5 seconds
- [ ] Manually update alert status to dispatched in Supabase SQL Editor
- [ ] Within 5 seconds (next poll) — sound stops
- [ ] Trigger two alerts — sound plays
- [ ] Resolve one alert — sound keeps playing
- [ ] Resolve both alerts — sound stops

---

### Phase 3 — Alert Detail Modal

**Goal:** Clicking an alert card or map marker opens a full modal overlay
with complete alert details.

#### What We Build

- Modal overlays entire screen above the map (not a separate page)
- Opens when operator clicks any alert card or map marker
- Fetches GET /alerts/:id on open
- Shows:
  - Alert status badge
  - Time triggered (formatted)
  - Coordinates (lat, lng)
  - Legitimacy score with progress bar
  - Crowd verification responses (list of yes/no answers)
  - Civilian user record (username, phone number)
- Close button (top right) dismisses modal
- Clicking outside modal area closes it
- Modal does not close automatically

#### Files

```
src/
├── components/
│   └── alert-modal.tsx         ← new
└── api/
    └── alerts.ts               ← updated with getAlert()
```

#### Test Checklist

- [ ] Click any alert card — modal opens
- [ ] Modal shows correct status, time, coordinates
- [ ] Legitimacy score bar renders correctly
- [ ] Crowd verification responses list populated
- [ ] Civilian username and phone number shown
- [ ] Click X button — modal closes
- [ ] Click outside modal — modal closes

---

### Phase 4 — Nearby Responders

**Goal:** Modal shows nearby available responders with expanding radius.
Responder markers appear on the map as they load.

#### Backend — New Endpoint

```
GET /responders/nearby?lat=X&lng=Y&radius=5
Header: user-id (UUID)
```

**Query logic:**
- Filter users where role = 'responder' and is_available = true
- Calculate Haversine distance from alert coordinates to each responder's
  last_lat, last_lng
- Return up to 10 responders sorted by distance ascending
- Each responder includes: id, username, distance_km, last_lat, last_lng,
  is_available

**Haversine formula (Python):**
```python
import math

def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat/2)**2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlng/2)**2)
    return R * 2 * math.asin(math.sqrt(a))
```

#### Expanding Radius Logic (Frontend)

```
Initial load when modal opens:
  radius = 5km
  fetch /responders/nearby?lat=X&lng=Y&radius=5
  if results < 10: show Load More button

On Load More click:
  radius = radius * 2
  fetch /responders/nearby?lat=X&lng=Y&radius={new_radius}
  append new responders to list (avoid duplicates by id)
  add new yellow markers to map
  if no new results: show "No more responders" message
```

#### Map Behavior

- Yellow glowing circle markers for each loaded responder
- Markers are added incrementally as more are loaded
- Markers persist on map while modal is open
- Markers are removed when modal closes

#### Files

```
jakada-server/
└── routers/
    └── responders.py           ← new backend file

jakada-operator-interface/
└── src/
    ├── components/
    │   └── alert-modal.tsx     ← updated with responder list
    └── api/
        └── responders.ts       ← new
```

#### Test Checklist

- [ ] Open alert modal — responder list loads automatically
- [ ] Responders sorted by distance (closest first)
- [ ] Yellow markers appear on map for each responder
- [ ] Click Load More — radius doubles
- [ ] New responders appear in list and on map
- [ ] When no more responders found — show message

---

### Phase 5 — Assign Responders

**Goal:** Operator can assign responders individually or all at once.
Alert status updates and sound stops after assignment.

#### What We Build

**Individual assign:**
- Each responder card has an ASSIGN button
- Click ASSIGN → POST /dispatches { alert_id, responder_id }
- On success: button changes to ASSIGNED (disabled, green)
- Responder marker on map changes style (yellow → green outline)

**Assign All:**
- ASSIGN ALL button at top of responder list
- Calls POST /dispatches for each unassigned responder in current list
- All buttons update to ASSIGNED on completion

**After assignment:**
- Alert status updates to dispatched automatically (backend handles this)
- Alert marker on map changes from red to blue
- Sound stops for this alert if it was the only active one
- Modal stays open showing dispatched status

**Resolve / Ignore:**
- RESOLVE button → PATCH /alerts/:id/status { status: resolved }
- IGNORE button → PATCH /alerts/:id/status { status: ignored }
- Modal closes after resolve or ignore
- Alert card updates in left feed on next poll

#### Files

```
src/
├── components/
│   └── alert-modal.tsx         ← updated with assign buttons
└── api/
    ├── alerts.ts               ← updated with updateAlertStatus()
    └── dispatches.ts           ← new
```

#### Test Checklist

- [ ] Click ASSIGN on one responder — button changes to ASSIGNED
- [ ] Dispatch created in Supabase dispatches table
- [ ] Click ASSIGN ALL — all buttons change to ASSIGNED
- [ ] Alert marker on map changes from red to blue
- [ ] Sound stops after all active alerts are dispatched
- [ ] Click RESOLVE — modal closes, alert turns green in feed
- [ ] Click IGNORE — modal closes, alert dims in feed

---

### Phase 6 — Polish + Deploy

**Goal:** Everything works end to end. Deployed to Vercel and accessible
from any browser.

#### What We Build

**Error handling:**
- No responders found within maximum radius → show message
- Dispatch fails → show error on button, allow retry
- Alert fetch fails → show retry button in modal
- Network offline → show banner at top of dashboard

**Loading states:**
- Skeleton cards in alert feed on initial load
- Spinner on Load More button while fetching
- Button loading state during assign

**Visual polish:**
- Smooth modal open/close animation (fade + scale)
- New alert cards animate in from top of feed
- Pulse animation on active alert markers
- Consistent spacing and typography throughout

**Auth re-integration:**
- Wire passkey login back in once dashboard is deployed to Vercel
- Operator role check on /dashboard route
- Redirect to /login if not authenticated

**Deployment:**
- pnpm build
- Deploy to Vercel
- Add Vercel domain to backend CORS origins
- Add Vercel domain to Render environment variables
- End-to-end test on production URL

#### Test Checklist

- [ ] Trigger panic from Android device
- [ ] Dashboard buzzes and shows alert within 5 seconds
- [ ] Operator opens modal, sees all alert details
- [ ] Operator loads nearby responders
- [ ] Operator assigns all responders
- [ ] Sound stops
- [ ] Alert marker turns blue on map
- [ ] Responder receives FCM notification (Phase 4 of main blueprint)
- [ ] Civilian sees dispatched message on ghost screen

---

## Phase Summary

| Phase | What Gets Built | Testable After? |
|---|---|---|
| 1 | Map + alert feed + polling | Yes — trigger alert from phone |
| 2 | Alert sound | Yes — trigger alert, hear sound |
| 3 | Alert detail modal | Yes — click alert, see details |
| 4 | Nearby responders + expand radius | Yes — see yellow markers on map |
| 5 | Assign responders | Yes — full dispatch flow works |
| 6 | Polish + deploy | Yes — full demo on production URL |

---

## Definition of Done

The operator dashboard is complete when:

- [ ] Operator can see live alerts appear on the map in real time
- [ ] Alert sound plays when there are unattended alerts
- [ ] Operator can open alert detail modal by clicking a card or marker
- [ ] Operator can see nearby responders on the map
- [ ] Operator can expand the search radius to find more responders
- [ ] Operator can assign individual responders or all at once
- [ ] Alert status updates to dispatched after assignment
- [ ] Operator can resolve or ignore alerts
- [ ] Everything works on the deployed Vercel URL

---

*Plan version 1.0 — Jakada Operator Dashboard*