<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventStore } from '../stores/eventStore'
import { useAuthStore } from '../stores/authStore'
import { useRegistrationStore } from '../stores/registrationStore'
import type { Event, Registration } from '../types'

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

const isOwner = computed(() =>
  authStore.user && event.value && event.value.createdBy === authStore.user.uid
)

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

function googleCalendarLink(ev: Event) {
  const start = new Date(ev.dateTime)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(ev.location)}&details=${encodeURIComponent(ev.description)}`
}

async function handleRegister() {
  if (!authStore.user) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }
  registering.value = true
  regError.value = ''
  try {
    await regStore.registerForEvent(authStore.user.uid, authStore.user.name, event.value!.id!, event.value!.title)
    isRegistered.value = true
    event.value = await eventStore.fetchEvent(route.params.id as string)
  } catch (e: any) {
    regError.value = e.message
  } finally {
    registering.value = false
  }
}

async function handleCancel() {
  const reg = regStore.userRegistrations.find(r => r.eventId === event.value!.id)
  if (!reg || !authStore.user) return
  cancelling.value = true
  try {
    await regStore.cancelRegistration(reg.id!, event.value!.id!, authStore.user.uid)
    isRegistered.value = false
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
        <h1 class="ev-hero-title">{{ event.title }}</h1>
        <div class="ev-hero-meta">
          <span>📅 {{ formatDate(event.dateTime) }}</span>
          <span>🕐 {{ formatTime(event.dateTime) }}</span>
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

            <!-- Event info grid -->
            <div class="ev-info-grid">
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
                <div>
                  <div class="ev-info-label">Location</div>
                  <div class="ev-info-value">{{ event.location }}</div>
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
                  <div v-for="(reg, i) in eventRegistrations" :key="reg.id" class="attendee-row">
                    <div class="attendee-avatar">{{ reg.userName?.[0]?.toUpperCase() || '?' }}</div>
                    <div class="attendee-info">
                      <div class="attendee-name">{{ reg.userName }}</div>
                      <div class="attendee-date">Registered {{ formatShortDate(reg.registeredAt) }}</div>
                    </div>
                    <span class="badge badge-success">✓ Confirmed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: action sidebar -->
          <div class="ev-sidebar">
            <div class="ev-sidebar-card">
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
              </div>

              <div v-if="regError" class="alert alert-error" style="margin-bottom:16px;">⚠️ {{ regError }}</div>

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
                  @click="handleRegister"
                  class="btn btn-primary btn-lg"
                  style="width:100%;margin-bottom:12px;"
                  :disabled="registering"
                >
                  <span v-if="registering">Registering…</span>
                  <span v-else>🎟️ Register Now — Free</span>
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
                :href="googleCalendarLink(event)"
                target="_blank"
                rel="noopener"
                class="btn btn-secondary btn-lg"
                style="width:100%;text-align:center;"
              >
                📅 Add to Google Calendar
              </a>

              <!-- Share -->
              <div class="sidebar-divider"></div>
              <div class="sidebar-detail-rows">
                <div class="sdr">
                  <span class="sdr-icon">📅</span>
                  <div>
                    <div class="sdr-label">Date & Time</div>
                    <div class="sdr-value">{{ formatDate(event.dateTime) }} at {{ formatTime(event.dateTime) }}</div>
                  </div>
                </div>
                <div class="sdr">
                  <span class="sdr-icon">📍</span>
                  <div>
                    <div class="sdr-label">Venue</div>
                    <div class="sdr-value">{{ event.location }}</div>
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
  </div>
</template>

<style scoped>
/* ── Hero ─────────────────────────────────────────── */
.ev-hero {
  position: relative;
  min-height: 340px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
.ev-hero-bg {
  position: absolute;
  inset: 0;
}
.ev-hero-bg img {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: brightness(0.45);
}
.ev-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 60%, transparent 100%);
}
.ev-hero-content {
  position: relative;
  z-index: 1;
  padding-bottom: 40px;
  padding-top: 32px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255,255,255,0.75);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  margin-bottom: 20px;
  transition: var(--transition);
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: var(--radius-full);
  backdrop-filter: blur(8px);
}
.back-btn:hover { color: white; background: rgba(255,255,255,0.18); text-decoration: none; }

.ev-cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  backdrop-filter: blur(8px);
  color: white;
  font-size: 12px; font-weight: 700;
  letter-spacing: 0.5px; text-transform: uppercase;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  margin-bottom: 12px;
}

.ev-hero-title {
  font-size: clamp(26px, 4vw, 46px);
  font-weight: 900;
  color: white;
  line-height: 1.1;
  letter-spacing: -1px;
  margin-bottom: 14px;
}

.ev-hero-meta {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 14px;
  color: rgba(255,255,255,0.75);
  font-weight: 500;
}

/* ── Layout ───────────────────────────────────────── */
.ev-detail-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 32px;
  align-items: start;
}

/* ── Owner bar ─────────────────────────────────────── */
.owner-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: rgba(79,70,229,0.06);
  border: 1px solid rgba(79,70,229,0.15);
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

/* ── Section cards ─────────────────────────────────── */
.ev-section-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-card);
}
.ev-section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 14px;
  letter-spacing: -0.3px;
}
.ev-description {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1.8;
}

/* ── Info grid ─────────────────────────────────────── */
.ev-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}
.ev-info-item {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  box-shadow: var(--shadow-card);
}
.ev-info-icon { font-size: 22px; flex-shrink: 0; }
.ev-info-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 4px; }
.ev-info-value { font-size: 14px; font-weight: 600; color: var(--text); line-height: 1.4; }

/* ── Attendees ─────────────────────────────────────── */
.attendee-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: white;
  font-size: 12px; font-weight: 700;
  width: 22px; height: 22px;
  border-radius: 50%;
  margin-left: 8px;
  vertical-align: middle;
}
.ticket-progress-wrap { margin-bottom: 20px; }
.ticket-progress-bar {
  height: 8px;
  background: var(--surface-2);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.ticket-progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.8s var(--ease);
}

.attendee-list { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; }
.attendee-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}
.attendee-row:hover { background: var(--surface-2); }
.attendee-avatar {
  width: 36px; height: 36px;
  background: var(--grad-primary);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 700; font-size: 14px;
  flex-shrink: 0;
}
.attendee-info { flex: 1; }
.attendee-name { font-size: 14px; font-weight: 600; color: var(--text); }
.attendee-date { font-size: 12px; color: var(--text-muted); }

/* ── Sidebar ───────────────────────────────────────── */
.ev-sidebar { position: sticky; top: 88px; }
.ev-sidebar-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 28px;
  box-shadow: var(--shadow-lg);
}

.sidebar-tickets {
  text-align: center;
  padding: 20px 0;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--surface-2);
}
.ticket-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px; font-weight: 700;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  margin-bottom: 10px;
}
.ticket-status.available { background: rgba(16,185,129,0.1); color: #059669; }
.ticket-status.low       { background: rgba(245,158,11,0.1); color: #d97706; }
.ticket-status.sold-out  { background: rgba(239,68,68,0.08); color: var(--danger); }
.ticket-numbers { font-size: 13px; color: var(--text-muted); }
.ticket-numbers strong { color: var(--text); font-size: 22px; font-weight: 800; }

.sidebar-divider {
  border: none;
  border-top: 1px solid var(--surface-2);
  margin: 20px 0;
}
.sidebar-detail-rows { display: flex; flex-direction: column; gap: 14px; }
.sdr { display: flex; align-items: flex-start; gap: 12px; }
.sdr-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
.sdr-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: var(--text-muted); margin-bottom: 3px; }
.sdr-value { font-size: 13px; font-weight: 500; color: var(--text); line-height: 1.4; }

/* ── Responsive ────────────────────────────────────── */
@media (max-width: 900px) {
  .ev-detail-grid { grid-template-columns: 1fr; }
  .ev-sidebar { position: static; }
  .ev-info-grid { grid-template-columns: 1fr; }
}
</style>
