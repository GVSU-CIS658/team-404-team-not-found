<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventStore } from '../stores/eventStore'
import { useAuthStore } from '../stores/authStore'
import { useRegistrationStore } from '../stores/registrationStore'
import type { Event, Registration, Venue } from '../types'
import RegistrationModal from '../components/RegistrationModal.vue'

const route = useRoute()
const router = useRouter()
const eventStore = useEventStore()
const authStore = useAuthStore()
const regStore = useRegistrationStore()

const event = ref<Event | null>(null)
const loading = ref(true)
const isRegistered = ref(false)
const registering = ref(false)
const cancelling = ref(false)
const regError = ref('')
const eventRegistrations = ref<Registration[]>([])
const showAttendees = ref(false)
const loadingAttendees = ref(false)
const userRegistration = ref<Registration | null>(null)

const venueStep = ref(false) // true while user is choosing a venue for multi-venue events
const selectedVenueId = ref<string | null>(null)

const showRegModal = ref(false)
const modalVenue = ref<{ id?: string; name?: string; address?: string }>({})

const isOwner = computed(() =>
  authStore.user && event.value && event.value.createdBy === authStore.user.uid
)

const isMultiVenue = computed(() => !!(event.value?.venues && event.value.venues.length > 0))

const selectedVenue = computed<Venue | null>(() => {
  if (!selectedVenueId.value || !event.value?.venues) return null
  return event.value.venues.find(v => v.id === selectedVenueId.value) || null
})

const ticketPercent = computed(() => {
  if (!event.value) return 0
  return Math.round((event.value.ticketsRemaining / event.value.ticketLimit) * 100)
})

const CAT_GRADIENT: Record<string, string> = {
  'Music': 'linear-gradient(135deg,#4c1d95,#7c3aed)',
  'Food & Drink': 'linear-gradient(135deg,#92400e,#d97706)',
  'Arts': 'linear-gradient(135deg,#831843,#be185d)',
  'Sports': 'linear-gradient(135deg,#064e3b,#047857)',
  'Community': 'linear-gradient(135deg,#0c4a6e,#0e7490)',
  'Education': 'linear-gradient(135deg,#1e1b4b,#4f46e5)',
  'General': 'linear-gradient(135deg,#334155,#475569)',
}

const CAT_EMOJI: Record<string, string> = {
  'Music':'🎵','Food & Drink':'🍺','Arts':'🎨',
  'Sports':'⚽','Community':'🤝','Education':'📚','General':'📌',
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })
}
function formatTime(d: Date) {
  return new Date(d).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
}
function formatShortDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function googleCalendarLink(ev: Event, venue?: Venue | null) {
  const dt = venue ? venue.dateTime : ev.dateTime
  const loc = venue ? venue.address : ev.location
  const start = new Date(dt)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(loc)}&details=${encodeURIComponent(ev.description)}`
}

function venueTicketPercent(v: Venue) {
  return Math.round((v.ticketsRemaining / v.ticketLimit) * 100)
}

// Registration flow — opens 3-step modal
function initiateRegister() {
  if (!authStore.user) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }
  if (isMultiVenue.value) {
    venueStep.value = true
  } else {
    modalVenue.value = {}
    showRegModal.value = true
  }
}

function selectVenueAndRegister(venueId: string) {
  selectedVenueId.value = venueId
  venueStep.value = false
  const v = event.value!.venues?.find(x => x.id === venueId)
  modalVenue.value = { id: v?.id, name: v?.name, address: v?.address }
  showRegModal.value = true
}

async function onRegistrationDone() {
  showRegModal.value = false
  isRegistered.value = true
  if (authStore.user) {
    userRegistration.value = await regStore.getUserVenueRegistration(authStore.user.uid, event.value!.id!)
  }
  event.value = await eventStore.fetchEvent(route.params.id as string)
}

async function handleCancel() {
  const reg = userRegistration.value || regStore.userRegistrations.find(r => r.eventId === event.value!.id)
  if (!reg || !authStore.user) return
  cancelling.value = true
  try {
    await regStore.cancelRegistration(reg.id!, event.value!.id!, authStore.user.uid, reg.venueId)
    isRegistered.value = false
    userRegistration.value = null
    event.value = await eventStore.fetchEvent(route.params.id as string)
  } finally {
    cancelling.value = false
  }
}

async function handleDelete() {
  if (!confirm('Delete this event? This cannot be undone.')) return
  await eventStore.deleteEvent(event.value!.id!)
  router.push('/events')
}

async function loadAttendees() {
  showAttendees.value = !showAttendees.value
  if (showAttendees.value && eventRegistrations.value.length === 0) {
    loadingAttendees.value = true
    eventRegistrations.value = await regStore.fetchEventRegistrations(event.value!.id!)
    loadingAttendees.value = false
  }
}

onMounted(async () => {
  const id = route.params.id as string
  event.value = await eventStore.fetchEvent(id)
  if (authStore.user) {
    isRegistered.value = await regStore.isUserRegistered(authStore.user.uid, id)
    await regStore.fetchUserRegistrations(authStore.user.uid)
    userRegistration.value = await regStore.getUserVenueRegistration(authStore.user.uid, id)
  }
  loading.value = false
})
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="loading-wrap">
    <div class="spinner"></div>
  </div>

  <!-- Not found -->
  <div v-else-if="!event" style="padding:80px;text-align:center;">
    <div style="font-size:56px;margin-bottom:20px;">😕</div>
    <h2 style="font-size:24px;font-weight:700;margin-bottom:12px;">Event not found</h2>
    <router-link to="/events" class="btn btn-primary">← Browse Events</router-link>
  </div>

  <!-- Event Detail -->
  <div v-else>
    <!-- ── Hero Banner ── -->
    <div class="ev-hero" :style="{ background: event.flyerURL ? 'var(--grad-hero)' : (CAT_GRADIENT[event.category || 'General'] || CAT_GRADIENT['General']) }">
      <div v-if="event.flyerURL" class="ev-hero-bg">
        <img :src="event.flyerURL" :alt="event.title" />
      </div>
      <div class="ev-hero-overlay"></div>
      <div class="container ev-hero-content">
        <router-link to="/events" class="back-btn">← Back to Events</router-link>
        <div class="ev-cat-pill">
          {{ CAT_EMOJI[event.category || 'General'] }} {{ event.category || 'General' }}
        </div>
        <div v-if="isMultiVenue" class="multi-venue-hero-badge">🏟️ Multi-Venue Event</div>
        <h1 class="ev-hero-title">{{ event.title }}</h1>
        <div class="ev-hero-meta">
          <span v-if="!isMultiVenue">📅 {{ formatDate(event.dateTime) }}</span>
          <span v-if="!isMultiVenue">🕐 {{ formatTime(event.dateTime) }}</span>
          <span v-if="isMultiVenue">📅 {{ event.venues!.length }} venue{{ event.venues!.length > 1 ? 's' : '' }} available</span>
          <span>📍 {{ event.location.split(',')[0] }}</span>
        </div>
      </div>
    </div>

    <!-- ── Main Content ── -->
    <div style="padding: 48px 0 80px; background: var(--bg);">
      <div class="container">
        <div class="ev-detail-grid">

          <!-- Left: main info -->
          <div class="ev-main">

            <!-- Owner controls -->
            <div v-if="isOwner" class="owner-bar">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:13px;font-weight:600;color:var(--primary);">✨ You're the organizer</span>
              </div>
              <div style="display:flex;gap:8px;">
                <router-link :to="`/edit-event/${event.id}`" class="btn btn-secondary btn-sm">✏️ Edit Event</router-link>
                <button @click="handleDelete" class="btn btn-danger btn-sm">🗑️ Delete</button>
              </div>
            </div>

            <!-- Description card -->
            <div class="ev-section-card">
              <h2 class="ev-section-title">About this Event</h2>
              <p class="ev-description">{{ event.description }}</p>
            </div>

            <!-- ── Multi-Venue cards ── -->
            <div v-if="isMultiVenue" class="ev-section-card">
              <h2 class="ev-section-title">🏟️ Available Venues</h2>
              <p style="font-size:14px;color:var(--text-muted);margin-bottom:20px;">
                Choose the venue nearest to you when you register. Each venue has its own date, time, and ticket availability.
              </p>
              <div class="venue-cards-grid">
                <div
                  v-for="(v, i) in event.venues"
                  :key="v.id"
                  class="venue-card"
                  :class="{
                    'venue-sold-out': v.ticketsRemaining <= 0,
                    'venue-selected': userRegistration?.venueId === v.id,
                  }"
                >
                  <div class="venue-card-num">Venue {{ i + 1 }}</div>
                  <div class="venue-card-name">{{ v.name }}</div>
                  <div class="venue-card-addr">📍 {{ v.address }}</div>
                  <div class="venue-card-dt">
                    📅 {{ formatDate(v.dateTime) }}<br>
                    🕐 {{ formatTime(v.dateTime) }}
                  </div>
                  <!-- Tickets mini bar -->
                  <div class="venue-mini-bar-wrap">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px;">
                      <span>{{ v.ticketsRemaining }} left</span>
                      <span>of {{ v.ticketLimit }}</span>
                    </div>
                    <div class="venue-mini-bar">
                      <div
                        class="venue-mini-fill"
                        :style="{
                          width: `${100 - venueTicketPercent(v)}%`,
                          background: venueTicketPercent(v) > 50 ? 'var(--grad-green)' : venueTicketPercent(v) > 20 ? 'var(--grad-accent)' : 'linear-gradient(135deg,#ef4444,#dc2626)'
                        }"
                      ></div>
                    </div>
                  </div>
                  <div v-if="v.ticketsRemaining <= 0" class="venue-sold-out-label">⛔ Sold Out</div>
                  <div v-else-if="userRegistration?.venueId === v.id" class="venue-registered-label">✅ You're registered here!</div>
                </div>
              </div>
            </div>

            <!-- Single-venue info grid -->
            <div v-if="!isMultiVenue" class="ev-info-grid">
              <div class="ev-info-item">
                <div class="ev-info-icon">📅</div>
                <div>
                  <div class="ev-info-label">Date</div>
                  <div class="ev-info-value">{{ formatDate(event.dateTime) }}</div>
                </div>
              </div>
              <div class="ev-info-item">
                <div class="ev-info-icon">🕐</div>
                <div>
                  <div class="ev-info-label">Time</div>
                  <div class="ev-info-value">{{ formatTime(event.dateTime) }}</div>
                </div>
              </div>
              <div class="ev-info-item" style="grid-column: 1/-1;">
                <div class="ev-info-icon">📍</div>
                <div style="flex:1;min-width:0;">
                  <div class="ev-info-label">Location</div>
                  <div class="ev-info-value">{{ event.location }}</div>
                  <div class="ev-map-wrap">
                    <iframe
                      class="ev-map"
                      :src="`https://www.google.com/maps?q=${encodeURIComponent(event.location + ', Grand Rapids, MI')}&output=embed`"
                      loading="lazy"
                      referrerpolicy="no-referrer-when-downgrade"
                      allowfullscreen
                    ></iframe>
                    <a
                      class="ev-map-open"
                      :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location + ', Grand Rapids, MI')}`"
                      target="_blank"
                      rel="noopener"
                    >Open in Maps →</a>
                  </div>
                </div>
              </div>
              <div class="ev-info-item">
                <div class="ev-info-icon">👤</div>
                <div>
                  <div class="ev-info-label">Organizer</div>
                  <div class="ev-info-value">{{ event.createdByName }}</div>
                </div>
              </div>
              <div class="ev-info-item">
                <div class="ev-info-icon">🏷️</div>
                <div>
                  <div class="ev-info-label">Category</div>
                  <div class="ev-info-value">{{ event.category }}</div>
                </div>
              </div>
            </div>

            <!-- Organizer: Attendees panel -->
            <div v-if="isOwner" class="ev-section-card">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <h2 class="ev-section-title" style="margin:0;">
                  🎟️ Registered Attendees
                  <span class="attendee-count-badge">{{ event.ticketLimit - event.ticketsRemaining }}</span>
                </h2>
                <button class="btn btn-secondary btn-sm" @click="loadAttendees">
                  {{ showAttendees ? 'Hide' : 'View All' }}
                </button>
              </div>

              <!-- Ticket progress bar -->
              <div class="ticket-progress-wrap">
                <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:500;margin-bottom:6px;">
                  <span style="color:var(--text-muted);">{{ event.ticketLimit - event.ticketsRemaining }} registered</span>
                  <span style="color:var(--text-muted);">{{ event.ticketsRemaining }} spots left</span>
                </div>
                <div class="ticket-progress-bar">
                  <div
                    class="ticket-progress-fill"
                    :style="{ width: `${100 - ticketPercent}%`, background: ticketPercent > 50 ? 'var(--grad-green)' : ticketPercent > 20 ? 'var(--grad-accent)' : 'linear-gradient(135deg,#ef4444,#dc2626)' }"
                  ></div>
                </div>
              </div>

              <!-- Attendee list -->
              <div v-if="showAttendees">
                <div v-if="loadingAttendees" class="loading-wrap" style="padding:32px;">
                  <div class="spinner"></div>
                </div>
                <div v-else-if="eventRegistrations.length === 0" style="text-align:center;padding:32px;color:var(--text-muted);">
                  No registrations yet.
                </div>
                <div v-else class="attendee-list">
                  <div v-for="reg in eventRegistrations" :key="reg.id" class="attendee-row">
                    <div class="attendee-avatar">{{ reg.userName?.[0]?.toUpperCase() || '?' }}</div>
                    <div class="attendee-info">
                      <div class="attendee-name">{{ reg.userName }}</div>
                      <div class="attendee-date">
                        Registered {{ formatShortDate(reg.registeredAt) }}
                        <span v-if="reg.venueName" class="attendee-venue-pill">📍 {{ reg.venueName }}</span>
                      </div>
                    </div>
                    <span class="badge badge-success">✓ Confirmed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: action sidebar -->
          <div class="ev-sidebar">

            <!-- ── Venue Picker Modal ── -->
            <div v-if="venueStep" class="venue-picker-card">
              <div class="venue-picker-header">
                <h3>🏟️ Choose Your Venue</h3>
                <button class="venue-picker-close" @click="venueStep = false">✕</button>
              </div>
              <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
                Select the venue closest to you:
              </p>
              <div class="venue-picker-list">
                <button
                  v-for="(v, i) in event.venues"
                  :key="v.id"
                  class="venue-pick-btn"
                  :class="{ 'sold-out': v.ticketsRemaining <= 0 }"
                  :disabled="v.ticketsRemaining <= 0 || registering"
                  @click="selectVenueAndRegister(v.id)"
                >
                  <div class="vpb-top">
                    <span class="vpb-num">{{ i + 1 }}</span>
                    <span class="vpb-name">{{ v.name }}</span>
                    <span v-if="v.ticketsRemaining <= 0" class="vpb-sold">Sold Out</span>
                    <span v-else class="vpb-avail">{{ v.ticketsRemaining }} left</span>
                  </div>
                  <div class="vpb-addr">📍 {{ v.address }}</div>
                  <div class="vpb-dt">📅 {{ formatDate(v.dateTime) }} · {{ formatTime(v.dateTime) }}</div>
                </button>
              </div>
            </div>

            <!-- ── Normal Sidebar ── -->
            <div v-else class="ev-sidebar-card">
              <!-- Ticket status -->
              <div class="sidebar-tickets">
                <div v-if="event.ticketsRemaining <= 0" class="ticket-status sold-out">
                  <span>⛔</span> Sold Out
                </div>
                <div v-else-if="event.ticketsRemaining <= event.ticketLimit * 0.15" class="ticket-status low">
                  <span>🔥</span> Almost Gone!
                </div>
                <div v-else class="ticket-status available">
                  <span>✅</span> Tickets Available
                </div>
                <div class="ticket-numbers">
                  <strong>{{ event.ticketsRemaining }}</strong>
                  <span> / {{ event.ticketLimit }} remaining</span>
                </div>

                <!-- Inline % full progress -->
                <div class="sidebar-progress-row">
                  <span class="sp-left">{{ event.ticketsRemaining }} / {{ event.ticketLimit }} remaining</span>
                  <span class="sp-right">{{ 100 - ticketProgress }}% full</span>
                </div>
                <div class="sidebar-progress-bar">
                  <div class="sidebar-progress-fill" :style="{ width: (100 - ticketProgress) + '%' }"></div>
                </div>
              </div>

              <div v-if="regError" class="alert alert-error" style="margin-bottom:16px;">⚠️ {{ regError }}</div>

              <!-- User's registered venue chip -->
              <div v-if="isRegistered && userRegistration?.venueName" class="reg-venue-chip">
                📍 Registered at <strong>{{ userRegistration.venueName }}</strong>
              </div>

              <!-- Registration actions -->
              <template v-if="isRegistered">
                <div class="alert alert-success" style="margin-bottom:14px;">
                  🎉 You're registered! See you there.
                </div>
                <button
                  @click="handleCancel"
                  class="btn btn-danger btn-lg"
                  style="width:100%;margin-bottom:12px;"
                  :disabled="cancelling"
                >
                  {{ cancelling ? 'Cancelling…' : 'Cancel Registration' }}
                </button>
              </template>

              <template v-else-if="event.ticketsRemaining > 0">
                <button
                  @click="initiateRegister"
                  class="btn btn-primary btn-lg"
                  style="width:100%;margin-bottom:12px;"
                  :disabled="registering"
                >
                  <span v-if="registering">⏳ Registering…</span>
                  <span v-else-if="isMultiVenue">🏟️ Choose Venue &amp; Register</span>
                  <span v-else>Register Now — Free</span>
                </button>
                <p v-if="!authStore.isAuthenticated" style="font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:12px;">
                  You'll be asked to sign in or create an account
                </p>
              </template>

              <div v-else class="alert alert-error" style="margin-bottom:14px;">
                This event is sold out.
              </div>

              <!-- Google Calendar -->
              <a
                :href="googleCalendarLink(event, isMultiVenue ? (event.venues?.find(v => v.id === userRegistration?.venueId) ?? null) : null)"
                target="_blank"
                rel="noopener"
                class="btn btn-secondary btn-lg"
                style="width:100%;text-align:center;"
              >
                📅 Add to Google Calendar
              </a>

              <div class="sidebar-divider"></div>
              <div class="sidebar-detail-rows">
                <div class="sdr">
                  <span class="sdr-icon">📅</span>
                  <div>
                    <div class="sdr-label">Date &amp; Time</div>
                    <div class="sdr-value">
                      <template v-if="isMultiVenue">{{ event.venues!.length }} dates available</template>
                      <template v-else>{{ formatDate(event.dateTime) }} at {{ formatTime(event.dateTime) }}</template>
                    </div>
                  </div>
                </div>
                <div class="sdr">
                  <span class="sdr-icon">📍</span>
                  <div>
                    <div class="sdr-label">Venue</div>
                    <div class="sdr-value">
                      <template v-if="isMultiVenue">{{ event.venues!.length }} locations — see below</template>
                      <template v-else>{{ event.location }}</template>
                    </div>
                  </div>
                </div>
                <div class="sdr">
                  <span class="sdr-icon">👤</span>
                  <div>
                    <div class="sdr-label">Organized by</div>
                    <div class="sdr-value">{{ event.createdByName }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Registration Modal -->
    <RegistrationModal
      v-if="showRegModal && event"
      :event="event"
      :venue-id="modalVenue.id"
      :venue-name="modalVenue.name"
      :venue-address="modalVenue.address"
      @close="showRegModal = false"
      @done="onRegistrationDone"
    />
  </div>
</template>

<style scoped>
.ev-map-wrap {
  margin-top: 12px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
  position: relative;
  background: var(--surface-2);
}
.ev-map {
  width: 100%;
  height: 280px;
  border: 0;
  display: block;
  filter: saturate(0.9);
}
[data-theme="dark"] .ev-map { filter: invert(0.88) hue-rotate(180deg) saturate(0.7); }
.ev-map-open {
  position: absolute; top: 10px; right: 10px;
  background: var(--surface);
  color: var(--primary);
  font-size: 12px; font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  text-decoration: none;
  border: 1px solid var(--border);
}
.ev-map-open:hover { background: var(--primary); color: white; text-decoration: none; }

/* ── Hero ─────────────────────────────────────────── */
.ev-hero {
  position: relative; min-height: 340px;
  display: flex; align-items: flex-end; overflow: hidden;
}
.ev-hero-bg { position: absolute; inset: 0; }
.ev-hero-bg img { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.45); }
.ev-hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 60%, transparent 100%);
}
.ev-hero-content { position: relative; z-index: 1; padding-bottom: 40px; padding-top: 32px; }

.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  color: rgba(255,255,255,0.75); font-size: 14px; font-weight: 500;
  text-decoration: none; margin-bottom: 20px; transition: var(--transition);
  padding: 6px 12px; background: rgba(255,255,255,0.1);
  border-radius: var(--radius-full); backdrop-filter: blur(8px);
}
.back-btn:hover { color: white; background: rgba(255,255,255,0.18); text-decoration: none; }

.ev-cat-pill {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
  backdrop-filter: blur(8px); color: white; font-size: 12px; font-weight: 700;
  letter-spacing: 0.5px; text-transform: uppercase; padding: 4px 12px;
  border-radius: var(--radius-full); margin-bottom: 8px;
}
.multi-venue-hero-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(251,191,36,0.2); border: 1px solid rgba(251,191,36,0.4);
  color: #fbbf24; font-size: 12px; font-weight: 700;
  padding: 4px 12px; border-radius: var(--radius-full);
  margin-bottom: 8px; margin-left: 8px;
}
.ev-hero-title {
  font-size: clamp(26px, 4vw, 46px); font-weight: 900; color: white;
  line-height: 1.1; letter-spacing: -1px; margin-bottom: 14px;
}
.ev-hero-meta {
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
  font-size: 14px; color: rgba(255,255,255,0.75); font-weight: 500;
}

/* ── Layout ── */
.ev-detail-grid {
  display: grid; grid-template-columns: 1fr 360px; gap: 32px; align-items: start;
}

/* ── Owner bar ── */
.owner-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; background: rgba(79,70,229,0.06);
  border: 1px solid rgba(79,70,229,0.15); border-radius: var(--radius-md);
  margin-bottom: 20px; flex-wrap: wrap; gap: 10px;
}

/* ── Section cards ── */
.ev-section-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 28px; margin-bottom: 20px; box-shadow: var(--shadow-card);
}
.ev-section-title {
  font-size: 18px; font-weight: 700; color: var(--text);
  margin-bottom: 14px; letter-spacing: -0.3px;
}
.ev-description { font-size: 15px; color: var(--text-muted); line-height: 1.8; }

/* ── Multi-venue cards ── */
.venue-cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 640px) { .venue-cards-grid { grid-template-columns: 1fr; } }

.venue-card {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: var(--radius-lg); padding: 16px 18px; transition: var(--transition);
}
.venue-card:hover { border-color: var(--primary-light); box-shadow: var(--shadow-card); }
.venue-card.venue-sold-out { opacity: 0.6; }
.venue-card.venue-selected {
  border-color: var(--primary); background: rgba(79,70,229,0.04);
  box-shadow: 0 0 0 3px rgba(79,70,229,0.12);
}
.venue-card-num {
  font-size: 10px; font-weight: 700; color: var(--primary); text-transform: uppercase;
  letter-spacing: 0.6px; margin-bottom: 6px;
}
.venue-card-name { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.venue-card-addr { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
.venue-card-dt { font-size: 12px; color: var(--text-muted); line-height: 1.8; margin-bottom: 12px; }
.venue-mini-bar-wrap { margin-bottom: 8px; }
.venue-mini-bar {
  height: 5px; background: var(--surface-2); border-radius: var(--radius-full); overflow: hidden;
}
.venue-mini-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.8s var(--ease); }
.venue-sold-out-label {
  font-size: 11px; font-weight: 700; color: var(--danger);
  background: rgba(239,68,68,0.08); padding: 3px 8px; border-radius: var(--radius-full);
  display: inline-block; margin-top: 4px;
}
.venue-registered-label {
  font-size: 11px; font-weight: 700; color: #059669;
  background: rgba(16,185,129,0.1); padding: 3px 8px; border-radius: var(--radius-full);
  display: inline-block; margin-top: 4px;
}

/* ── Info grid ── */
.ev-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.ev-info-item {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: 18px; display: flex; align-items: flex-start; gap: 14px; box-shadow: var(--shadow-card);
}
.ev-info-icon { font-size: 22px; flex-shrink: 0; }
.ev-info-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 4px; }
.ev-info-value { font-size: 14px; font-weight: 600; color: var(--text); line-height: 1.4; }

/* ── Attendees ── */
.attendee-count-badge {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--primary); color: white; font-size: 12px; font-weight: 700;
  width: 22px; height: 22px; border-radius: 50%; margin-left: 8px; vertical-align: middle;
}
.ticket-progress-wrap { margin-bottom: 20px; }
.ticket-progress-bar {
  height: 8px; background: var(--surface-2); border-radius: var(--radius-full); overflow: hidden;
}
.ticket-progress-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.8s var(--ease); }

/* Sidebar inline % progress */
.sidebar-progress-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-top: 14px; margin-bottom: 8px;
  font-size: 13px;
}
.sp-left  { color: var(--text-muted); font-weight: 500; }
.sp-right { color: var(--text); font-weight: 700; }
.sidebar-progress-bar {
  height: 8px; background: var(--surface-2);
  border-radius: var(--radius-full); overflow: hidden;
}
.sidebar-progress-fill {
  height: 100%; background: var(--primary);
  border-radius: var(--radius-full); transition: width 0.8s var(--ease);
}
.attendee-list { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; }
.attendee-row {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-radius: var(--radius-sm); transition: var(--transition);
}
.attendee-row:hover { background: var(--surface-2); }
.attendee-avatar {
  width: 36px; height: 36px; background: var(--grad-primary); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 700; font-size: 14px; flex-shrink: 0;
}
.attendee-info { flex: 1; }
.attendee-name { font-size: 14px; font-weight: 600; color: var(--text); }
.attendee-date { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.attendee-venue-pill {
  background: rgba(79,70,229,0.08); color: var(--primary);
  font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: var(--radius-full);
}

/* ── Venue Picker ── */
.venue-picker-card {
  background: var(--surface); border: 1.5px solid var(--primary-light);
  border-radius: var(--radius-xl); padding: 24px;
  box-shadow: 0 0 0 4px rgba(232,97,74,0.08), var(--shadow-lg);
  animation: fadeUp 0.25s var(--ease) both;
}
.venue-picker-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.venue-picker-header h3 { font-size: 18px; font-weight: 700; color: var(--text); }
.venue-picker-close {
  background: var(--surface-2); border: none; border-radius: 50%;
  width: 28px; height: 28px; font-size: 12px; cursor: pointer;
  color: var(--text-muted); display: flex; align-items: center; justify-content: center;
  transition: var(--transition);
}
.venue-picker-close:hover { background: var(--surface-3); color: var(--text); }
.venue-picker-list { display: flex; flex-direction: column; gap: 10px; }
.venue-pick-btn {
  text-align: left; background: var(--surface); border: 1.5px solid var(--border);
  border-radius: var(--radius-lg); padding: 14px 16px; cursor: pointer; transition: var(--transition);
  width: 100%;
}
.venue-pick-btn:hover:not(:disabled) { border-color: var(--primary); background: rgba(79,70,229,0.04); transform: translateY(-1px); }
.venue-pick-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.venue-pick-btn.sold-out { opacity: 0.5; }
.vpb-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.vpb-num {
  width: 22px; height: 22px; background: var(--grad-primary); color: white;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.vpb-name { font-size: 14px; font-weight: 700; color: var(--text); flex: 1; }
.vpb-avail { font-size: 11px; font-weight: 600; color: #059669; background: rgba(16,185,129,0.1); padding: 2px 7px; border-radius: var(--radius-full); }
.vpb-sold { font-size: 11px; font-weight: 600; color: var(--danger); background: rgba(239,68,68,0.08); padding: 2px 7px; border-radius: var(--radius-full); }
.vpb-addr { font-size: 12px; color: var(--text-muted); margin-bottom: 3px; }
.vpb-dt { font-size: 11px; color: var(--text-muted); }

/* ── Sidebar ── */
.ev-sidebar { position: sticky; top: 88px; }
.ev-sidebar-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-xl); padding: 28px; box-shadow: var(--shadow-lg);
}
.sidebar-tickets {
  text-align: center; padding: 20px 0; margin-bottom: 20px; border-bottom: 1px solid var(--surface-2);
}
.ticket-status {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 700; padding: 6px 16px; border-radius: var(--radius-full); margin-bottom: 10px;
}
.ticket-status.available { background: rgba(16,185,129,0.1); color: #059669; }
.ticket-status.low       { background: rgba(245,158,11,0.1); color: #d97706; }
.ticket-status.sold-out  { background: rgba(239,68,68,0.08); color: var(--danger); }
.ticket-numbers { font-size: 13px; color: var(--text-muted); }
.ticket-numbers strong { color: var(--text); font-size: 22px; font-weight: 800; }

.reg-venue-chip {
  background: rgba(79,70,229,0.06); border: 1px solid rgba(79,70,229,0.15);
  border-radius: var(--radius-md); padding: 8px 12px; font-size: 13px;
  color: var(--text); margin-bottom: 12px; text-align: center;
}
.reg-venue-chip strong { color: var(--primary); }

.sidebar-divider { border: none; border-top: 1px solid var(--surface-2); margin: 20px 0; }
.sidebar-detail-rows { display: flex; flex-direction: column; gap: 14px; }
.sdr { display: flex; align-items: flex-start; gap: 12px; }
.sdr-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
.sdr-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: var(--text-muted); margin-bottom: 3px; }
.sdr-value { font-size: 13px; font-weight: 500; color: var(--text); line-height: 1.4; }

/* ── Responsive ── */
@media (max-width: 900px) {
  .ev-detail-grid { grid-template-columns: 1fr; }
  .ev-sidebar { position: static; }
  .ev-info-grid { grid-template-columns: 1fr; }
}
</style>
