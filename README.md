# Schedulr — Grand Rapids Community Events

[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/d7M8Pab7)

**Live app:** https://schedulr-gvsu.web.app
**Course:** GVSU CIS 658 — Web Application Programming (Winter 2026)
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

| Function                | Caller role | Purpose                                               |
|-------------------------|-------------|-------------------------------------------------------|
| `createEvent`           | organizer   | Validates + creates an event                          |
| `registerForEvent`      | any auth    | Transactional: checks capacity, decrements tickets    |
| `cancelRegistration`    | owner       | Transactional: re-increments tickets, caps at limit   |
| `deleteEvent`           | organizer   | Deletes event + cascades registration cleanup         |

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

## 7. Repository Layout — Frontend vs Backend

The codebase is split into two clearly separated parts:

### Frontend (Vue 3 SPA) — `src/`
```
src/
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

### Backend (Firebase Cloud Functions) — `functions/`
```
functions/
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
in `src/`** owns rendering and reads, the **backend in `functions/`**
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

cd functions && npm install && npm run build
firebase emulators:start      # functions + firestore emulator
```

## 10. Deploying

```bash
npm run build
firebase deploy --only hosting
firebase deploy --only functions
```

## 11. Test Account

```
Email:    demo@schedulr.app
Password: Schedulr2026!
```

(Create via the Sign Up page on the live site.)
