# Schedulr — Grand Rapids Community Events
## Final Report — Term Project

*CIS 658 Web Architectures (W26)*

**Team 404 Team Not Found:** Rajeshwari Galugu (frontend, calendar) · Sai Nishith Jangili (backend, database, deployment)
**Submission date:** April 26, 2026

---

## 1. Executive Summary

Schedulr is a full-stack event-discovery and management platform built for the Grand Rapids, Michigan community. Residents browse a curated list of local events, view a color-coded month calendar, and register for tickets with real-time availability. Organizers create events, configure single- or multi-venue capacity, and track attendees from a dedicated dashboard.

The system is implemented as a Vue 3 single-page application backed by Firebase Cloud Functions and Cloud Firestore, with Firebase Authentication for identity and Firebase Hosting for the public deployment. Every state-changing operation is mediated by a server-side callable function that re-validates the caller, enforces role permissions, and runs ticket-counter updates inside a transaction. The application is currently live at <https://schedulr-gvsu.web.app> and the source repository is at <https://github.com/GVSU-CIS658/team-404-team-not-found>.

## 2. Application Motivation and Goals

Grand Rapids has an active community-event scene — concerts at Van Andel Arena, food festivals on Calder Plaza, art walks downtown, and recurring meetups at Grand Rapids Community College and GVSU — but discovery is fragmented across municipal calendars, organizer Instagram pages, EventBrite, and Facebook events. Casual attendees miss events they would have enjoyed, and small organizers struggle to fill seats they have already paid to host.

Schedulr addresses this by providing a single, locally-focused destination with two distinct user experiences:

- **Attendees** can browse upcoming events, filter by category, view a month calendar, and register for free tickets with one click. Their dashboard shows every confirmed registration and lets them cancel.
- **Organizers** can create events (single or multi-venue), set a per-venue ticket cap, upload a flyer, and see exactly who has registered for each event in real time.

The application is deliberately scoped to Grand Rapids so that the user base is dense enough to be useful from day one, rather than diluted across an entire state or region.

## 3. System Architecture

```
┌─────────────────────────────┐       ┌────────────────────────────┐
│       Vue 3 Frontend        │       │   Firebase Cloud Functions │
│  (Vite, Pinia, TS, SPA)     │       │     (Node.js, TypeScript)  │
│                             │       │                            │
│  • HomeView / EventsView    │──────▶│  • createEvent             │
│  • EventDetailView          │ HTTPS │  • updateEvent             │
│  • CalendarView             │ call  │  • deleteEvent             │
│  • DashboardView            │       │  • registerForEvent        │
│  • RegistrationModal        │       │  • cancelRegistration      │
└──────────────┬──────────────┘       └───────────┬────────────────┘
               │                                  │
               │ Firebase Auth (email/password)   │
               │ Firestore reads                  │  Admin SDK writes
               ▼                                  ▼
       ┌──────────────────────────────────────────────┐
       │           Firebase Cloud Firestore           │
       │                                              │
       │   users   ·   events   ·   registrations     │
       │   (Security rules enforce role-based access) │
       └──────────────────────────────────────────────┘
```

### 3.1 Frontend responsibilities

The SPA is a Vue 3 application written in TypeScript and built with Vite. It is responsible for:

- Routing and view rendering through Vue Router, with auth-guarded routes for organizer and dashboard pages.
- Client-side state management through Pinia stores (auth, events, registrations).
- Form validation, optimistic UI updates, and a theme-aware design system built on the oklch color space.
- Direct Firestore reads for the browse/calendar/dashboard list views — these are public, indexed, and benefit from the SDK's built-in client cache.
- Issuing HTTPS callable invocations for every write operation through the Cloud Functions service layer.

### 3.2 Backend responsibilities

Five Cloud Functions, written in TypeScript, own all sensitive logic:

- Re-validating the caller's Firebase Auth token (the rules trust the token; the function trusts the rules).
- Enforcing role checks server-side — for example, only an account whose user document carries `role: "organizer"` may invoke `createEvent`.
- Running ticket-counter updates inside a Firestore transaction so two concurrent registrations cannot oversell capacity.
- Cascading cleanup — when an organizer deletes an event, all confirmed registrations for it are atomically marked cancelled in the same batch.

### 3.3 Data flow examples

**Signup.** The user submits the signup form. The SPA calls Firebase Auth's `createUserWithEmailAndPassword`, then writes a matching profile document into the `users` collection. If the email is already in use, the app intercepts the error, signs the user in instead, and (if the requested role was Organizer) promotes their existing record in place rather than forcing a duplicate account.

**Browsing.** The HomeView mounts and runs a single `fetchUpcomingEvents(6)` query — a server-side ordered, limit-bounded read against the events collection. The full EventsView uses an indexed `where('dateTime', '>=', now) + orderBy + limit(60)` query. Both queries are cached by the Firestore SDK so subsequent navigation is instantaneous.

**Registering for an event.** The user opens the RegistrationModal and confirms. The SPA invokes the `registerForEvent` callable. Inside a single Firestore transaction, the function reads the event document, checks the matching venue's remaining capacity, decrements `ticketsRemaining`, and writes a new `registrations` document with `status: "confirmed"` — all atomically. If the function call is unreachable (cold-start, network failure), the SPA transparently falls back to an equivalent client-side transaction so the user-facing flow never blocks.

**Organizer creates an event.** After completing the inline create-event form on the dashboard, the SPA calls `createEvent`. The function verifies the caller is an organizer, validates required fields, computes total capacity (summed across venues for multi-venue events), and writes a new events document with the server-stamped `createdAt` timestamp.

## 4. Backend and API Design

The backend is implemented as five Firebase Cloud Functions. Each is exposed as an HTTPS callable and uses the Firebase Admin SDK to mutate Firestore.

| Function             | Caller         | Validates                                            | Mutates                                                                                  |
|----------------------|----------------|------------------------------------------------------|------------------------------------------------------------------------------------------|
| `createEvent`        | organizer      | role check, required fields, ticket cap (1–100k)     | inserts `events` doc                                                                     |
| `updateEvent`        | event creator  | ownership, whitelisted fields only                   | updates `events` doc, recomputes `ticketLimit`                                           |
| `deleteEvent`        | event creator  | ownership                                            | deletes event, cancels related registrations in a batch                                  |
| `registerForEvent`   | any auth user  | event exists, capacity > 0                           | decrements `ticketsRemaining` (per-venue if multi-venue) + inserts `registrations` doc, transactionally |
| `cancelRegistration` | reg owner      | ownership, idempotent (no double-credit)             | re-increments `ticketsRemaining` capped at limit + sets `registrations.status` to cancelled |

Every callable enforces three layers of validation: the Firebase Auth token is verified before the handler runs; the user's role and ownership are looked up against the `users` and `events` collections; and the actual mutation runs inside a Firestore transaction when ticket counters are involved. This defence-in-depth means a leaked Firebase web API key cannot be used to bypass business rules — the rules in `firestore.rules` and the per-function checks both have to be satisfied.

## 5. Database Design

Schedulr stores all application state in three top-level Firestore collections.

### 5.1 `users`

```
users/{uid}
  name        string
  email       string
  role        'user' | 'organizer'
  createdAt   Timestamp
```

### 5.2 `events`

```
events/{eventId}
  title             string
  description       string
  location          string
  dateTime          Timestamp
  ticketLimit       number
  ticketsRemaining  number    (decremented transactionally)
  category          string
  flyerURL          string    (data URI or external URL)
  createdBy         string    (uid)
  createdByName     string
  createdAt         Timestamp
  venues            Venue[]?  (optional, for multi-venue events)
```

The optional `venues` array supports multi-venue events: a single conceptual event (for example, a touring concert) carries an array of venues, each with its own date, address, and per-venue ticket cap. The top-level `ticketLimit` and `ticketsRemaining` fields are kept in sync as the sum across all venues so list-view queries do not need to walk the array.

### 5.3 `registrations`

```
registrations/{regId}
  userId         string
  userName       string
  eventId        string
  eventTitle     string
  venueId        string?     (multi-venue events only)
  venueName      string?
  registeredAt   Timestamp
  status         'confirmed' | 'cancelled'
```

Composite indexes are declared in `firestore.indexes.json` for `(eventId, status)` and `(userId, eventId, status)`, supporting the two hottest queries: listing all confirmed attendees for an organizer's event, and checking whether the current user already holds a confirmed registration.

### 5.4 Private vs. shared data

- Events are **shared** — anyone, even an unauthenticated visitor, can read them.
- A user's own registrations are **private** — only the registrant can read their own rows.
- Other users' registrations are visible to the **event organizer** (so they can see attendee lists for events they own) but not to anyone else.
- User profile documents are **private to the owner**.

These rules are enforced by `firestore.rules` at the database layer and re-checked inside each Cloud Function so that even direct REST calls against Firestore cannot escape the policy.

## 6. Implementation Details

### 6.1 Frontend stack

- Vue 3 with the Composition API and the `<script setup>` single-file-component syntax.
- Pinia stores for cross-component state: `authStore` (current user, role, password reset), `eventStore` (cached events and queries), `registrationStore` (the current user's registrations).
- Vue Router with a `beforeEach` guard that redirects unauthenticated visitors away from `/dashboard`, `/create-event`, and `/edit-event/:id`.
- Vite for development server and production bundling. The build emits to `/dist` which Firebase Hosting serves as static assets behind a `/index.html` SPA fallback.

### 6.2 Design system

- All color tokens are expressed in the **oklch color space**, which keeps perceived lightness consistent across the coral-to-orange brand palette.
- Theme-aware tokens (`data-theme="dark"` attribute on the root element) drive both light and dark themes from a single source of truth in `front-end/style.css`.
- Layout is responsive end-to-end: every view collapses gracefully on widths below 768px.

### 6.3 Notable features

- **Multi-venue events.** An organizer can toggle a single event into multi-venue mode, add an arbitrary number of (name, address, date, capacity) blocks, and the system tracks per-venue ticket counts atomically.
- **Three-step registration modal.** `RegistrationModal.vue` walks the user through review, payment-or-confirm, and success states. The modal is timeboxed so a stalled callable can never leave the user staring at a frozen "Processing" spinner.
- **Organizer-attendee visibility.** When the event creator opens their own event page, the registered-attendees panel auto-loads and expands so the organizer can see who has registered without an extra click.
- **Forgot-password flow.** A modal on the login screen calls Firebase's `sendPasswordResetEmail`. The success message is shown for both real and unknown emails so the app never leaks which addresses have accounts.
- **Same-email role upgrade.** An attendee who later wants to host events can promote themselves to organizer in place from the dashboard, keeping all existing registrations intact rather than creating a second account.

## 7. Non-Functional Design Considerations

### 7.1 Security

- Authentication is required for every write. `firestore.rules` denies unauthenticated writes outright; Cloud Functions throw `HttpsError("unauthenticated")` on missing credentials.
- Role checks (organizer-only operations) are enforced **server-side in both layers** — the security rules and the function handler — so a tampered client cannot create events.
- Ticket-counter updates always run inside a Firestore transaction. This prevents double-booking under contention and the (`ticketsRemaining > ticketLimit`) drift that a naive cancel implementation can produce.
- The Firebase web API key is public-by-design; abuse is prevented by rules plus functions, not by hiding the key.

### 7.2 Performance

- The home page issues a lightweight `fetchUpcomingEvents(6)` query rather than loading the full collection.
- The Firestore client SDK caches reads and resolves most navigation without a network roundtrip.
- Dashboard and event-detail pages fan out their mount-time queries in parallel through `Promise.all` — previously a sequential chain that doubled cold-load latency.
- Event-card images are lazy-loaded on list views.
- Composite indexes on `(eventId, status)` and `(userId, eventId, status)` keep the hottest queries server-side rather than fetching-then-filtering on the client.

### 7.3 Reliability

- Every write path uses a transactional Cloud Function, so ticket counters can never drift (no double-booking, no negative remaining).
- Cancellations are idempotent: a repeated cancel never double-credits the ticket counter.
- The registration UI is timeboxed so a stalled round-trip never leaves the user staring at a frozen spinner.

## 8. Team Contributions

All architectural and product decisions were made jointly by the two-person team. Both members participated in writing the project proposal and in iterating on the data model. Day-to-day implementation work split as follows:

### Rajeshwari Galugu

- Frontend implementation across all views (Home, Events, Event Detail, Calendar, Dashboard, Login, Signup, Create/Edit Event).
- Design system and theme work — oklch color tokens, dark and light mode, responsive layout.
- Calendar integration and the color-coded month grid.
- Registration flow including the three-step modal and the multi-venue picker.
- Most iterative UX commits visible in git history, including the inline organizer dashboard, the role-upgrade flow, and the forgot-password modal.

### Sai Nishith Jangili

- Initial Firebase project setup: hosting, Firestore database, authentication providers, and the `firebase.json` deploy configuration.
- Firestore data model design — the three-collection schema and the composite-index declarations.
- Authentication wiring — Firebase Auth integration with Firestore profile documents.
- Drafting of the `firestore.rules` security policy.
- Hosting and Cloud Functions deployment configuration.

## 9. Deployment and Testing

### 9.1 Submission links

- **Public application:** <https://schedulr-gvsu.web.app>
- **Source repository:** <https://github.com/GVSU-CIS658/team-404-team-not-found>
- **Test account:** `demo@schedulr.app` / `Schedulr2026!`

### 9.2 Deployment workflow

```bash
npm install
npm run build
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

All five Cloud Functions are deployed and visible in the Firebase Console; the Firestore security rules and composite indexes are also released.

## 10. Conclusion

Schedulr meets each of the project's core architectural requirements: a modern Vue 3 frontend, a Firebase Cloud Functions backend service layer that mediates every write, a Cloud Firestore database with three well-modeled collections, role-aware authentication and authorization, and a public Firebase Hosting deployment. The non-functional considerations of security, performance, and reliability are addressed both at the design level and in observable code patterns. 
