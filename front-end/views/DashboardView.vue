<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useEventStore } from '../stores/eventStore'
import { useRegistrationStore } from '../stores/registrationStore'
import type { Event, Registration, User, Venue } from '../types'
import { v4 as uuidv4 } from 'uuid'

const authStore = useAuthStore()
const eventStore = useEventStore()
const regStore = useRegistrationStore()
const route = useRoute()
const router = useRouter()

const myEvents = ref<Event[]>([])
const allUsers = ref<User[]>([])
const eventRegs = ref<Record<string, Registration[]>>({})
const expandedEvent = ref<string | null>(null)
const loadingRegs = ref<Record<string, boolean>>({})
const activeTab = ref<'registrations' | 'myEvents' | 'attendees' | 'members'>('registrations')
const loading = ref(true)

// Inline create-event form state
const showCreateForm = ref(false)
const ev_title = ref('')
const ev_description = ref('')
const ev_category = ref('General')
const ev_location = ref('')
const ev_date = ref('')           // YYYY-MM-DD
const ev_time = ref('18:00')      // HH:MM (default 6:00 PM)
const ev_ticketLimit = ref(100)
const ev_price = ref(0)
const ev_flyer = ref<File | null>(null)
const ev_multiVenue = ref(false)
const ev_venues = ref<Venue[]>([blankVenue()])
const ev_venueDateTimes = ref<string[]>([''])
const ev_error = ref('')
const ev_submitting = ref(false)

const categories = ['Music', 'Food & Drink', 'Arts', 'Sports', 'Community', 'Education', 'General']

function blankVenue(): Venue {
  return {
    id: uuidv4(),
    name: '',
    address: '',
    dateTime: new Date(),
    ticketLimit: 50,
    ticketsRemaining: 50,
  }
}
function addVenue() {
  ev_venues.value.push(blankVenue())
  ev_venueDateTimes.value.push('')
}
function removeVenue(idx: number) {
  if (ev_venues.value.length > 1) {
    ev_venues.value.splice(idx, 1)
    ev_venueDateTimes.value.splice(idx, 1)
  }
}
function syncVenueDT(idx: number) {
  if (ev_venueDateTimes.value[idx]) {
    ev_venues.value[idx].dateTime = new Date(ev_venueDateTimes.value[idx])
  }
}
function handleFileChange(e: globalThis.Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) ev_flyer.value = target.files[0]
}

function resetForm() {
  ev_title.value = ''
  ev_description.value = ''
  ev_category.value = 'General'
  ev_location.value = ''
  ev_date.value = ''
  ev_time.value = '18:00'
  ev_ticketLimit.value = 100
  ev_price.value = 0
  ev_flyer.value = null
  ev_multiVenue.value = false
  ev_venues.value = [blankVenue()]
  ev_venueDateTimes.value = ['']
  ev_error.value = ''
}

function openCreateForm() {
  resetForm()
  showCreateForm.value = true
}
function closeCreateForm() {
  showCreateForm.value = false
}

async function handleCreateEvent() {
  ev_error.value = ''
  if (!authStore.user) return
  if (!ev_multiVenue.value && !ev_date.value) {
    ev_error.value = 'Please pick a date for the event.'
    return
  }
  ev_submitting.value = true
  try {
    const preparedVenues = ev_multiVenue.value
      ? ev_venues.value.map((v, i) => ({
          ...v,
          dateTime: ev_venueDateTimes.value[i] ? new Date(ev_venueDateTimes.value[i]) : v.dateTime,
          ticketsRemaining: v.ticketLimit,
        }))
      : undefined

    // Combine date + time into a single Date for single-venue events
    const dt = ev_date.value
      ? new Date(`${ev_date.value}T${ev_time.value || '18:00'}`)
      : new Date()

    const newId = await eventStore.createEvent(
      {
        title: ev_title.value,
        description: ev_description.value,
        location: ev_multiVenue.value ? (ev_venues.value[0]?.address || '') : ev_location.value,
        dateTime: ev_multiVenue.value
          ? (ev_venueDateTimes.value[0] ? new Date(ev_venueDateTimes.value[0]) : new Date())
          : dt,
        ticketLimit: ev_multiVenue.value
          ? ev_venues.value.reduce((s, v) => s + v.ticketLimit, 0)
          : ev_ticketLimit.value,
        ticketsRemaining: ev_multiVenue.value
          ? ev_venues.value.reduce((s, v) => s + v.ticketLimit, 0)
          : ev_ticketLimit.value,
        createdBy: authStore.user.uid,
        createdByName: authStore.user.name,
        flyerURL: '',
        category: ev_category.value,
        venues: preparedVenues,
      } as Event,
      ev_flyer.value || undefined
    )
    // Refresh local list and close the form
    myEvents.value = (await eventStore.fetchMyEvents(authStore.user.uid)) || []
    showCreateForm.value = false
    resetForm()
    // Stay on dashboard so the new event appears in the list, but offer a path to view it
    router.push(`/events/${newId}`)
  } catch (e: any) {
    ev_error.value = e.message
  } finally {
    ev_submitting.value = false
  }
}

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(d: Date) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ─── Organizer-aggregate stats ──────────────────────────────
const totalEvents = computed(() => myEvents.value.length)
const ticketsSold = computed(() =>
  myEvents.value.reduce((sum, e) => sum + (e.ticketLimit - e.ticketsRemaining), 0)
)
const totalRevenue = computed(() => 0) // events are free for now; placeholder for paid-event roadmap
const activeEvents = computed(() => {
  const now = Date.now()
  return myEvents.value.filter(e => +new Date(e.dateTime) >= now).length
})

// Existing computed kept for the attendee tabs
const totalRegistrations = computed(() =>
  myEvents.value.reduce((sum, e) => sum + (e.ticketLimit - e.ticketsRemaining), 0)
)

async function toggleEventAttendees(eventId: string) {
  if (expandedEvent.value === eventId) { expandedEvent.value = null; return }
  expandedEvent.value = eventId
  if (!eventRegs.value[eventId]) {
    loadingRegs.value[eventId] = true
    eventRegs.value[eventId] = await regStore.fetchEventRegistrations(eventId)
    loadingRegs.value[eventId] = false
  }
}

async function handleCancelReg(regId: string, eventId: string) {
  if (!confirm('Cancel this registration?')) return
  await regStore.cancelRegistration(regId, eventId, authStore.user!.uid)
}

onMounted(async () => {
  if (authStore.user) {
    const uid = authStore.user.uid
    const tasks: Promise<unknown>[] = [regStore.fetchUserRegistrations(uid)]
    if (authStore.isOrganizer) {
      tasks.push(eventStore.fetchMyEvents(uid).then(r => { myEvents.value = r || [] }))
    }
    if (authStore.isOwner) {
      tasks.push(authStore.fetchAllUsers().then(r => { allUsers.value = r }))
    }
    await Promise.all(tasks)
  }
  // /create-event now redirects here with ?new=1 — open the form automatically
  if (route.query.new === '1') showCreateForm.value = true
  loading.value = false
})

// If the user navigates to /dashboard?new=1 after mount, react too
watch(() => route.query.new, v => { if (v === '1') showCreateForm.value = true })
</script>

<template>
  <!-- ════════════════════════════════════════════════════════
       ORGANIZER VIEW — header, stats, inline create form, list
       ════════════════════════════════════════════════════════ -->
  <div v-if="authStore.isOrganizer" class="org-dash">
    <div class="container org-container">

      <!-- Header row: title + primary action -->
      <div class="org-head">
        <div>
          <h1 class="org-title">Organizer Dashboard</h1>
          <p class="org-sub">Manage your events, {{ authStore.user?.name }}</p>
        </div>
        <button
          v-if="!showCreateForm"
          class="btn btn-primary btn-lg"
          @click="openCreateForm"
        >+ New Event</button>
        <button
          v-else
          class="btn btn-secondary btn-lg"
          @click="closeCreateForm"
        >× Cancel</button>
      </div>

      <!-- Stats -->
      <div class="org-stats">
        <div class="org-stat">
          <div class="org-stat-num">{{ totalEvents }}</div>
          <div class="org-stat-label">Total Events</div>
        </div>
        <div class="org-stat">
          <div class="org-stat-num">{{ ticketsSold }}</div>
          <div class="org-stat-label">Tickets Sold</div>
        </div>
        <div class="org-stat">
          <div class="org-stat-num">${{ totalRevenue }}</div>
          <div class="org-stat-label">Total Revenue</div>
        </div>
        <div class="org-stat">
          <div class="org-stat-num">{{ activeEvents }}</div>
          <div class="org-stat-label">Active Events</div>
        </div>
      </div>

      <!-- Inline Create Event form -->
      <div v-if="showCreateForm" class="create-card">
        <h2 class="create-title">Create New Event</h2>
        <div v-if="ev_error" class="alert alert-error" style="margin-bottom:16px;">{{ ev_error }}</div>

        <form @submit.prevent="handleCreateEvent">
          <div class="form-group">
            <label>Event title *</label>
            <input v-model="ev_title" type="text" placeholder="My Awesome Event" required />
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Category</label>
              <select v-model="ev_category">
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date *</label>
              <input v-model="ev_date" type="date" :required="!ev_multiVenue" />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Start time</label>
              <input v-model="ev_time" type="time" />
            </div>
            <div class="form-group">
              <label>Price ($)</label>
              <input v-model.number="ev_price" type="number" min="0" step="0.01" />
            </div>
          </div>

          <div class="form-group">
            <label>Location</label>
            <input v-model="ev_location" type="text" placeholder="Venue, Grand Rapids, MI" :required="!ev_multiVenue" />
          </div>

          <div class="form-group" style="max-width:200px">
            <label>Ticket Limit</label>
            <input v-model.number="ev_ticketLimit" type="number" min="1" required />
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea v-model="ev_description" rows="4" placeholder="Describe your event…"></textarea>
          </div>

          <!-- Advanced: Flyer + Multi-venue (kept from previous build) -->
          <details class="advanced-toggle">
            <summary>Advanced options (flyer image, multi-venue)</summary>
            <div class="form-group">
              <label>Event flyer <span class="label-hint">(optional)</span></label>
              <input type="file" accept="image/*" @change="handleFileChange" class="file-input" />
            </div>

            <div class="venue-toggle-row">
              <span class="toggle-label">Single venue</span>
              <button
                type="button"
                class="toggle-switch"
                :class="{ active: ev_multiVenue }"
                @click="ev_multiVenue = !ev_multiVenue"
                :aria-checked="ev_multiVenue"
                role="switch"
              ><span class="toggle-thumb"></span></button>
              <span class="toggle-label">Multiple venues</span>
            </div>

            <template v-if="ev_multiVenue">
              <div v-for="(venue, idx) in ev_venues" :key="venue.id" class="venue-block">
                <div class="venue-block-header">
                  <span class="venue-number">Venue {{ idx + 1 }}</span>
                  <button v-if="ev_venues.length > 1" type="button" class="venue-remove-btn" @click="removeVenue(idx)">Remove</button>
                </div>
                <div class="form-row-2">
                  <div class="form-group">
                    <label>Venue name *</label>
                    <input v-model="venue.name" type="text" placeholder="Van Andel Arena" required />
                  </div>
                  <div class="form-group">
                    <label>Address *</label>
                    <input v-model="venue.address" type="text" placeholder="130 W Fulton St, Grand Rapids, MI" required />
                  </div>
                </div>
                <div class="form-row-2">
                  <div class="form-group">
                    <label>Date &amp; time *</label>
                    <input v-model="ev_venueDateTimes[idx]" type="datetime-local" required @change="syncVenueDT(idx)" />
                  </div>
                  <div class="form-group">
                    <label>Ticket capacity *</label>
                    <input v-model.number="venue.ticketLimit" type="number" min="1" required />
                  </div>
                </div>
              </div>
              <button type="button" class="add-venue-btn" @click="addVenue">+ Add another venue</button>
            </template>
          </details>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-lg" @click="closeCreateForm">Cancel</button>
            <button type="submit" class="btn btn-primary btn-lg" :disabled="ev_submitting">
              {{ ev_submitting ? 'Publishing…' : 'Publish Event' }}
            </button>
          </div>
        </form>
      </div>

      <!-- All non-form sections render below; My Registrations renders even when
           the organizer hasn't created any events of their own. -->
      <template v-else-if="!loading">
        <!-- Events: empty state or list -->
        <div v-if="myEvents.length === 0" class="empty-card">
          <div class="empty-cal">📅</div>
          <h3 class="empty-title">No events yet</h3>
          <p class="empty-text">Create your first event to get started</p>
          <button class="btn btn-primary btn-lg" @click="openCreateForm">+ Create Event</button>
        </div>
        <div v-else>
          <div class="org-section-head">
            <h2 class="org-section-title">My Events</h2>
          </div>
          <div class="dash-list">
            <div v-for="ev in myEvents" :key="ev.id" class="dash-list-item">
              <div class="dli-img-wrap">
                <img v-if="ev.flyerURL && !ev.flyerURL.startsWith('data:')" :src="ev.flyerURL" :alt="ev.title" />
                <img v-else-if="ev.flyerURL" :src="ev.flyerURL" :alt="ev.title" />
                <div v-else class="dli-img-placeholder">{{ ev.category?.[0]?.toUpperCase() || 'E' }}</div>
              </div>
              <div class="dli-info">
                <router-link :to="`/events/${ev.id}`" class="dli-title">{{ ev.title }}</router-link>
                <div class="dli-meta">{{ fmt(ev.dateTime) }} · {{ fmtTime(ev.dateTime) }}</div>
                <div class="dli-ticket-bar-wrap">
                  <div class="dli-ticket-bar">
                    <div
                      class="dli-ticket-fill"
                      :style="{ width: `${Math.round(((ev.ticketLimit - ev.ticketsRemaining) / Math.max(1, ev.ticketLimit)) * 100)}%` }"
                    ></div>
                  </div>
                  <span class="dli-ticket-text">
                    {{ ev.ticketLimit - ev.ticketsRemaining }} / {{ ev.ticketLimit }} registered
                  </span>
                </div>
              </div>
              <div class="dli-actions">
                <router-link :to="`/events/${ev.id}`" class="btn btn-secondary btn-sm">View</router-link>
                <router-link :to="`/edit-event/${ev.id}`" class="btn btn-secondary btn-sm">Edit</router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- My Registrations — independent of whether the organizer has events. -->
        <div class="extra-section">
          <div class="org-section-head">
            <h2 class="org-section-title">My Registrations</h2>
            <span class="badge badge-primary">{{ regStore.userRegistrations.length }}</span>
          </div>
          <div v-if="regStore.userRegistrations.length === 0" class="empty-state-small">
            <p>You haven't registered for any events yet. <router-link to="/events" class="text-link">Browse events →</router-link></p>
          </div>
          <div v-else class="dash-list">
            <div v-for="reg in regStore.userRegistrations" :key="reg.id" class="dash-list-item">
              <div class="dli-accent-bar"></div>
              <div class="dli-info">
                <router-link :to="`/events/${reg.eventId}`" class="dli-title">{{ reg.eventTitle }}</router-link>
                <div class="dli-meta">Registered {{ fmt(reg.registeredAt) }}</div>
              </div>
              <div class="dli-actions">
                <router-link :to="`/events/${reg.eventId}`" class="btn btn-secondary btn-sm">View</router-link>
                <button @click="handleCancelReg(reg.id!, reg.eventId)" class="btn btn-danger btn-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Event attendees expandable — only when organizer has events -->
        <div v-if="myEvents.length > 0" class="extra-section">
          <div class="org-section-head">
            <h2 class="org-section-title">Event Attendees</h2>
          </div>
          <div class="dash-list">
            <div v-for="ev in myEvents" :key="ev.id" class="attendee-event-card">
              <div class="aec-header" @click="toggleEventAttendees(ev.id!)">
                <div class="aec-left">
                  <div class="aec-event-name">{{ ev.title }}</div>
                  <div class="aec-meta">{{ fmt(ev.dateTime) }} · {{ ev.location.split(',')[0] }}</div>
                </div>
                <div class="aec-right">
                  <div class="aec-reg-badge">
                    <span class="aec-reg-num">{{ ev.ticketLimit - ev.ticketsRemaining }}</span>
                    <span class="aec-reg-label"> registered</span>
                  </div>
                  <div class="aec-chevron" :class="{ open: expandedEvent === ev.id }">›</div>
                </div>
              </div>
              <div v-if="expandedEvent === ev.id" class="aec-body">
                <div v-if="loadingRegs[ev.id!]" class="loading-wrap" style="padding:24px;">
                  <div class="spinner"></div>
                </div>
                <div v-else-if="!eventRegs[ev.id!] || eventRegs[ev.id!].length === 0" style="padding:24px;text-align:center;color:var(--text-muted);font-size:14px;">
                  No registrations for this event yet.
                </div>
                <table v-else class="attendee-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Attendee Name</th>
                      <th>Registered On</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(reg, i) in eventRegs[ev.id!]" :key="reg.id">
                      <td class="td-num">{{ i + 1 }}</td>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                          <div class="small-avatar">{{ reg.userName?.[0]?.toUpperCase() || '?' }}</div>
                          <span class="td-name">{{ reg.userName }}</span>
                        </div>
                      </td>
                      <td class="td-muted">{{ fmt(reg.registeredAt) }}</td>
                      <td><span class="badge badge-success">Confirmed</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Owner-only members table -->
        <div v-if="authStore.isOwner" class="extra-section">
          <div class="org-section-head">
            <h2 class="org-section-title">All App Members <span class="owner-tag">Owner only</span></h2>
            <span class="badge badge-primary">{{ allUsers.length }} total</span>
          </div>
          <table class="attendee-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(u, i) in allUsers" :key="u.uid">
                <td class="td-num">{{ i + 1 }}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="small-avatar">{{ u.name?.[0]?.toUpperCase() || '?' }}</div>
                    <span class="td-name">{{ u.name }}</span>
                  </div>
                </td>
                <td class="td-muted">{{ u.email }}</td>
                <td>
                  <span class="badge" :class="u.role === 'organizer' ? 'badge-warning' : 'badge-primary'">
                    {{ u.role === 'organizer' ? 'Organizer' : 'Attendee' }}
                  </span>
                </td>
                <td class="td-muted">{{ u.createdAt ? fmt(u.createdAt) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-if="loading" class="loading-wrap"><div class="spinner"></div></div>
    </div>
  </div>


  <!-- ════════════════════════════════════════════════════════
       ATTENDEE VIEW — kept the existing tabbed layout
       ════════════════════════════════════════════════════════ -->
  <template v-else>
    <div class="page-hero">
      <div class="container page-hero-content">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="page-hero-title">Dashboard</div>
            <div class="page-hero-sub">Welcome back, {{ authStore.user?.name }}</div>
          </div>
        </div>
      </div>
    </div>

    <div style="padding: 40px 0 80px; background: var(--bg);">
      <div class="container">

        <!-- Stats -->
        <div class="dash-stats" style="margin-bottom:32px;">
          <div class="dash-stat">
            <div class="dash-stat-num">{{ regStore.userRegistrations.length }}</div>
            <div class="dash-stat-label">My Registrations</div>
          </div>
          <div class="dash-stat">
            <div class="dash-stat-num" style="font-size:18px;">Attendee</div>
            <div class="dash-stat-label">Account Type</div>
          </div>
        </div>

        <div v-if="loading" class="loading-wrap"><div class="spinner"></div></div>

        <div v-else>
          <h2 class="org-section-title" style="margin-bottom:16px;">My Registrations</h2>
          <div v-if="regStore.userRegistrations.length === 0" class="empty-state">
            <div class="empty-title">No registrations yet</div>
            <p class="empty-text">Browse events and register for ones you're interested in.</p>
            <router-link to="/events" class="btn btn-primary btn-lg">Browse Events</router-link>
          </div>
          <div v-else class="dash-list">
            <div v-for="reg in regStore.userRegistrations" :key="reg.id" class="dash-list-item">
              <div class="dli-accent-bar"></div>
              <div class="dli-info">
                <router-link :to="`/events/${reg.eventId}`" class="dli-title">{{ reg.eventTitle }}</router-link>
                <div class="dli-meta">Registered {{ fmt(reg.registeredAt) }}</div>
              </div>
              <div class="dli-actions">
                <router-link :to="`/events/${reg.eventId}`" class="btn btn-secondary btn-sm">View</router-link>
                <button @click="handleCancelReg(reg.id!, reg.eventId)" class="btn btn-danger btn-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
/* ───────────────────────── Organizer dashboard ───────────────────────── */
.org-dash { background: var(--bg); min-height: calc(100vh - var(--nav-h, 64px)); padding: 48px 0 80px; }
.org-container { max-width: 1280px; }

.org-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  margin-bottom: 32px;
}
.org-title { font-size: 44px; font-weight: 800; letter-spacing: -1.5px; color: var(--text); margin-bottom: 4px; }
.org-sub   { font-size: 15px; color: var(--text-muted); }

/* Stats */
.org-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 18px;
  margin-bottom: 32px;
}
.org-stat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px 28px;
  transition: var(--transition);
}
.org-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.org-stat-num   { font-size: 38px; font-weight: 800; color: var(--text); letter-spacing: -1px; line-height: 1.1; }
.org-stat-label { font-size: 14px; color: var(--text-muted); margin-top: 4px; }

/* Empty state */
.empty-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 64px 32px;
  text-align: center;
}
.empty-cal   { font-size: 56px; margin-bottom: 16px; opacity: 0.85; }
.empty-card .empty-title { font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
.empty-card .empty-text  { font-size: 14px; color: var(--text-muted); margin-bottom: 24px; }

.empty-state-small {
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 18px 20px;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted);
}
.text-link { color: var(--primary); font-weight: 700; }

/* Section heads */
.org-section-head {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 16px;
}
.org-section-title { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.owner-tag {
  font-size: 11px; font-weight: 700; color: var(--primary);
  background: rgba(232,97,74,0.10); padding: 3px 8px; border-radius: 6px;
  margin-left: 10px; letter-spacing: 0.4px;
}
.extra-section { margin-top: 48px; }

/* ───────────────────────── Inline create-event form ──────────────────── */
.create-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 36px 36px 32px;
  margin-bottom: 24px;
}
.create-title { font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 24px; letter-spacing: -0.3px; }

.form-group { margin-bottom: 18px; }
:deep(label) { display: block; color: var(--text); font-weight: 600; margin-bottom: 6px; font-size: 13px; }
:deep(input), :deep(select), :deep(textarea) {
  width: 100%;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  transition: var(--transition);
}
:deep(input:focus), :deep(select:focus), :deep(textarea:focus) {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(232,97,74,0.15);
}
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .form-row-2 { grid-template-columns: 1fr; } .create-card { padding: 24px 20px; } }
.label-hint { font-weight: 400; color: var(--text-muted); font-size: 12px; }
.file-input { padding: 10px 12px; cursor: pointer; }

.advanced-toggle {
  margin-top: 8px; margin-bottom: 8px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 12px 16px;
}
.advanced-toggle summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--text-muted);
  font-size: 13px;
  padding: 4px 0;
}
.advanced-toggle[open] { padding-bottom: 18px; }
.advanced-toggle[open] summary { margin-bottom: 14px; color: var(--text); }

.venue-toggle-row { display: flex; align-items: center; gap: 12px; margin: 12px 0 18px; flex-wrap: wrap; }
.toggle-label { font-size: 13px; font-weight: 500; color: var(--text-muted); }
.toggle-switch { width: 44px; height: 24px; background: var(--surface-2); border: none; border-radius: 12px; cursor: pointer; position: relative; transition: var(--transition); flex-shrink: 0; }
.toggle-switch.active { background: var(--primary); }
.toggle-thumb { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: white; border-radius: 50%; transition: transform 0.2s var(--ease); box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
.toggle-switch.active .toggle-thumb { transform: translateX(20px); }

.venue-block { background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; }
.venue-block-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.venue-number { font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px; }
.venue-remove-btn { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: var(--danger); font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; cursor: pointer; }
.add-venue-btn { width: 100%; padding: 12px; background: transparent; border: 2px dashed var(--border); border-radius: 12px; color: var(--text); font-size: 14px; font-weight: 600; cursor: pointer; }
.add-venue-btn:hover { border-color: var(--primary); color: var(--primary); }

.form-actions {
  display: grid; grid-template-columns: 1fr 2fr; gap: 14px;
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--surface-2);
}
@media (max-width: 600px) { .form-actions { grid-template-columns: 1fr; } }

/* ───────────────────────── Shared list / table styles ────────────────── */
.dash-list { display: flex; flex-direction: column; gap: 12px; }
.dash-list-item {
  display: flex; align-items: center; gap: 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 20px;
  transition: var(--transition);
}
.dash-list-item:hover { border-color: var(--primary-light); transform: translateX(2px); }
.dli-accent-bar { width: 4px; height: 36px; background: var(--primary); border-radius: 2px; }
.dli-img-wrap   { width: 60px; height: 60px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: var(--surface-2); display: flex; align-items: center; justify-content: center; }
.dli-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
.dli-img-placeholder { font-size: 22px; font-weight: 800; color: var(--primary); }
.dli-info { flex: 1; min-width: 0; }
.dli-title { font-size: 15px; font-weight: 700; color: var(--text); display: block; margin-bottom: 2px; }
.dli-title:hover { color: var(--primary); }
.dli-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.dli-ticket-bar-wrap { display: flex; align-items: center; gap: 10px; }
.dli-ticket-bar { flex: 1; max-width: 200px; height: 6px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
.dli-ticket-fill { height: 100%; background: var(--primary); border-radius: 999px; }
.dli-ticket-text { font-size: 12px; color: var(--text-muted); }
.dli-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* Attendee accordion */
.attendee-event-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.aec-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: var(--transition); }
.aec-header:hover { background: var(--surface-2); }
.aec-event-name { font-size: 15px; font-weight: 700; color: var(--text); }
.aec-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.aec-right { display: flex; align-items: center; gap: 14px; }
.aec-reg-badge { display: flex; flex-direction: column; align-items: flex-end; }
.aec-reg-num { font-size: 18px; font-weight: 800; color: var(--primary); }
.aec-reg-label { font-size: 11px; color: var(--text-muted); }
.aec-chevron { font-size: 22px; color: var(--text-muted); transition: transform 0.2s; }
.aec-chevron.open { transform: rotate(90deg); }
.aec-body { border-top: 1px solid var(--border); }

.attendee-table { width: 100%; border-collapse: collapse; }
.attendee-table th, .attendee-table td { padding: 12px 16px; text-align: left; font-size: 13px; }
.attendee-table th { background: var(--surface-2); font-weight: 700; color: var(--text); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
.attendee-table tr { border-bottom: 1px solid var(--border); }
.attendee-table tr:last-child { border-bottom: none; }
.td-num { color: var(--text-muted); font-weight: 600; }
.td-muted { color: var(--text-muted); }
.td-name { color: var(--text); font-weight: 600; }
.small-avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--grad-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }

/* ───────────────────────── Attendee dashboard (existing) ─────────────── */
.dash-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; }
.dash-stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 28px 20px 22px; text-align: center; box-shadow: var(--shadow-card); }
.dash-stat-num { font-size: 32px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.dash-stat-label { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

.empty-state { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 48px 24px; text-align: center; }
.empty-state .empty-title { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
.empty-state .empty-text { font-size: 14px; color: var(--text-muted); margin-bottom: 20px; }

@media (max-width: 768px) {
  .org-title { font-size: 32px; }
  .dash-list-item { flex-wrap: wrap; }
}
</style>
