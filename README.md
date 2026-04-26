# Schedulr — Grand Rapids Community Events

[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/d7M8Pab7)

**Live app:** https://schedulr-gvsu.web.app
**Repository:** https://github.com/GVSU-CIS658/team-404-team-not-found
**Course:** CIS 658 Web Architectures (W26)
**Team:** 404 Team Not Found
- Rajeshwari Galugu — Frontend development and calendar integration
- Sai Nishith Jangili — Backend development, database design, authentication, and deployment

---

## 1. What It Is

Schedulr is a full-stack event discovery and management platform focused on
Grand Rapids, Michigan. Residents can browse community events, register for
tickets with real-time availability, view a color-coded month calendar, sync
events to Google Calendar, and manage their registrations from a personal
dashboard. Organizers can create events with flyer uploads, set ticket limits,
run single- or multi-venue events, and track attendees.

## 2. System Architecture

```
┌─────────────────────────────┐       ┌────────────────────────────┐
│       Vue 3 Frontend        │       │   Firebase Cloud Functions │
│  (Vite · Pinia · TS · SPA)  │       │        (Node.js 18)        │
│                             │       │                            │
│  • HomeView / EventsView    │──────▶│  • createEvent             │
│  • EventDetailView          │ HTTPS │  • registerForEvent        │
│  • CalendarView / Dashboard │ call  │  • cancelRegistration      │
│  • 3-step RegistrationModal │       │  • deleteEvent             │
└──────────────┬──────────────┘       └───────────┬────────────────┘
               │                                  │
               │ Firebase Auth (email/password)   │
               │ Firestore reads                  │  admin SDK writes
               ▼                                  ▼
        ┌──────────────────────────────────────────────┐
        │           Firebase Cloud Firestore           │
        │                                              │
        │  users  ·  events  ·  registrations          │
        │  (Security rules enforce role-based access)  │
        └──────────────────────────────────────────────┘
```

**Frontend responsibilities:** routing, UI state, form validation,
optimistic updates, theme toggle, calendar rendering, image uploads.

**Backend responsibilities:** authoritative writes for sensitive
operations (create/delete events, register/cancel tickets), role checks,
transactional ticket counter updates, input validation.

**Data flow:** Reads go directly from the SPA to Firestore (fast, cached
by the client SDK, protected by security rules). Writes go through
`httpsCallable` Cloud Functions, which re-validate the caller's auth
token, check role (`organizer` or `attendee`), and mutate Firestore via
the Admin SDK inside a transaction when ticket counts are involved.

## 3. API Overview (Cloud Functions)

All five callables live in `back-end/src/` and are invoked from the SPA
via `httpsCallable(functions, '<name>')`. Each one re-validates the
caller's auth token and (where applicable) the user's role before
mutating Firestore via the Admin SDK.

| Function                | Caller role | Purpose                                                          |
|-------------------------|-------------|------------------------------------------------------------------|
| `createEvent`           | organizer   | Validates fields, supports single- or multi-venue, creates event |
| `updateEvent`           | event owner | Whitelisted-field update; recomputes ticket totals on venues     |
| `deleteEvent`           | event owner | Cascades by marking related registrations as cancelled           |
| `registerForEvent`      | any auth    | Transactional: decrements venue/event tickets, writes reg doc    |
| `cancelRegistration`    | reg owner   | Idempotent: re-increments tickets capped at limit                |

## 4. Database Design

Three top-level Firestore collections:

### `users/{uid}`
```
name         string
email        string
role         'attendee' | 'organizer'
createdAt    Timestamp
```

### `events/{eventId}`
```
title             string
description       string
location          string
dateTime          Timestamp
ticketLimit       number
ticketsRemaining  number         // decremented transactionally
category          string
flyerURL          string         // public or data URI
createdBy         string (uid)
createdByName     string
createdAt         Timestamp
venues            Venue[]?       // optional, for multi-venue events
```

### `registrations/{regId}`
```
userId         string
userName       string
eventId        string
eventTitle     string
venueId        string?
venueName      string?
registeredAt   Timestamp
status         'confirmed' | 'cancelled'
```

Composite indexes on `(eventId, status)` and `(userId, status)` are
declared in `firestore.indexes.json`.

## 5. Private vs. Shared Data

| Data                         | Visibility                                     |
|------------------------------|------------------------------------------------|
| Events                       | Shared — anyone can read                       |
| Own registrations            | Private — only the owner can read              |
| Other users' registrations   | Hidden — only the event organizer can read     |
| User profile                 | Private — only self and admin functions read   |

Enforced in `firestore.rules` and re-checked in each Cloud Function.

## 6. Non-Functional Considerations

**Security**
- Auth required for every write.
- Role check (`organizer`) enforced server-side in Cloud Functions,
  not just in the UI.
- Transactional ticket updates prevent double-booking and
  `ticketsRemaining > ticketLimit` drift.
- Client-visible Firebase config is public-by-design; abuse is
  prevented by rules + functions, not by hiding the API key.

**Performance**
- Home page uses a lightweight `fetchUpcomingEvents(6)` query instead
  of loading the full events collection.
- Firestore client SDK caches reads and resolves most navigation
  without network roundtrips.
- Images are lazy-loaded on list views.
- Dashboard and event-detail pages fan out their mount-time queries
  in parallel via `Promise.all` — was previously a sequential chain
  that doubled cold-load latency.

**Reliability**
- Every write path uses a transactional Cloud Function so ticket
  counters can never drift (no double-booking, no negative remaining,
  no `ticketsRemaining > ticketLimit` after a cancel).
- The frontend stores wrap each callable in a try/catch and fall back
  to a direct, equally-safe Firestore transaction if the function is
  ever unreachable (cold start, network blip). The user-facing flow
  keeps working; the architecture-as-deployed stays the canonical
  path. This is documented in `front-end/stores/*.ts` as the
  `*Direct()` helpers.
- Registration UI is timeboxed (20 s) so a stalled round-trip never
  leaves the user staring at a frozen "Processing…" spinner.

## 7. Repository Layout — Frontend vs Backend

The codebase is split into two clearly separated parts:

### Frontend (Vue 3 SPA) — `front-end/`
```
front-end/
├── main.ts                  ← Vue app bootstrap, router & Pinia install
├── App.vue                  ← top-level shell (navbar, theme toggle, footer)
├── style.css                ← global design tokens (oklch palette, theme)
├── firebase.ts              ← client SDK init (Auth, Firestore)
│
├── views/                   ← route-level pages
│   ├── HomeView.vue           landing + hero + stats + CTA
│   ├── EventsView.vue         browse / filter / search events
│   ├── EventDetailView.vue    single event + registration modal
│   ├── CreateEventView.vue    organizer: new event form
│   ├── EditEventView.vue      organizer: edit existing event
│   ├── CalendarView.vue       month grid with color-coded events
│   ├── DashboardView.vue      attendee: my registrations
│   ├── LoginView.vue          email/password sign-in
│   └── SignupView.vue         attendee/organizer role pick + create
│
├── components/              ← reusable UI pieces
│   └── RegistrationModal.vue  3-step ticket registration flow
│
├── stores/                  ← Pinia state
│   ├── auth.ts                current user + role
│   └── events.ts              cached events + queries
│
├── router/                  ← Vue Router config + auth guards
└── types/                   ← shared TypeScript interfaces
```

### Backend (Firebase Cloud Functions) — `back-end/`
```
back-end/
├── src/
│   └── index.ts             ← all callable functions:
│                              createEvent, deleteEvent,
│                              registerForEvent, cancelRegistration
├── package.json             ← node 18 deps (firebase-admin, functions)
└── tsconfig.json            ← backend TS compilation
```

### Shared Infrastructure (root)
```
firebase.json                ← hosting + functions deploy targets
firestore.rules              ← security rules (frontend ↔ backend bridge)
firestore.indexes.json       ← composite indexes
.firebaserc                  ← project alias (schedulr-gvsu)
vite.config.ts               ← frontend build config
.env.local                   ← Firebase web config (git-ignored)
```

This separation matches the architecture diagram in §2: the **frontend
in `front-end/`** owns rendering and reads, the **backend in `back-end/`**
owns authoritative writes and role checks.

## 8. Tech Stack

- Vue 3 (Composition API, `<script setup>`) · Vue Router · Pinia
- TypeScript · Vite build
- Firebase Auth · Firestore · Cloud Functions (Node 18) · Hosting
- Design tokens: oklch color space, Outfit typeface, coral `#E8614A` primary

## 9. Running Locally

```bash
npm install
cp .env.example .env.local    # add your Firebase web config
npm run dev                   # frontend on http://localhost:5173

cd back-end && npm install && npm run build
firebase emulators:start      # functions + firestore emulator
```

## 10. Deploying

```bash
npm run build
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Cloud Functions run on **Node 20** (2nd-gen callables) in `us-central1`.
The project is on the **Blaze** plan; usage stays well inside the free
tier for school-project traffic.

**Live deployment status:**
- Hosting: https://schedulr-gvsu.web.app
- 5 callables live: `createEvent`, `updateEvent`, `deleteEvent`,
  `registerForEvent`, `cancelRegistration`
- Firestore composite indexes built (see `firestore.indexes.json`)
- Security rules enforced via `firestore.rules`

## 11. Test Account

```
Email:    demo@schedulr.app
Password: Schedulr2026!
```

(Create via the Sign Up page on the live site.)
