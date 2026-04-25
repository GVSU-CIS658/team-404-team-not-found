<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useEventStore } from '../stores/eventStore'
import { useRegistrationStore } from '../stores/registrationStore'
import type { Event, Registration, User } from '../types'

const authStore = useAuthStore()
const eventStore = useEventStore()
const regStore = useRegistrationStore()

const myEvents = ref<Event[]>([])
const allUsers = ref<User[]>([])
const eventRegs = ref<Record<string, Registration[]>>({})
const expandedEvent = ref<string | null>(null)
const loadingRegs = ref<Record<string, boolean>>({})
const activeTab = ref<'registrations' | 'myEvents' | 'attendees' | 'members'>('registrations')
const loading = ref(true)

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(d: Date) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

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
    // Fan out the dashboard's mount-time queries in parallel — sequencing
    // them made the page take 3-4× longer to render.
    const tasks: Promise<unknown>[] = [regStore.fetchUserRegistrations(uid)]
    if (authStore.isOrganizer) {
      tasks.push(
        eventStore.fetchMyEvents(uid).then(r => { myEvents.value = r || [] })
      )
    }
    if (authStore.isOwner) {
      tasks.push(
        authStore.fetchAllUsers().then(r => { allUsers.value = r })
      )
    }
    await Promise.all(tasks)
  }
  loading.value = false
})
</script>

<template>
  <!-- Page hero -->
  <div class="page-hero">
    <div class="container page-hero-content">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
        <div>
          <div class="page-hero-title">Dashboard</div>
          <div class="page-hero-sub">Welcome back, {{ authStore.user?.name }}</div>
        </div>
        <router-link v-if="authStore.isOrganizer" to="/create-event" class="btn btn-primary btn-lg" style="background:rgba(255,255,255,0.18);border:2px solid rgba(255,255,255,0.35);color:white;">
          Create Event
        </router-link>
      </div>
    </div>
  </div>

  <div style="padding: 40px 0 80px; background: var(--bg);">
    <div class="container">

      <!-- Stats row -->
      <div class="dash-stats" style="margin-bottom:32px;">
        <div class="dash-stat">
          <div class="dash-stat-num">{{ regStore.userRegistrations.length }}</div>
          <div class="dash-stat-label">My Registrations</div>
        </div>
        <template v-if="authStore.isOrganizer">
          <div class="dash-stat">
            <div class="dash-stat-num">{{ myEvents.length }}</div>
            <div class="dash-stat-label">Events Created</div>
          </div>
          <div class="dash-stat">
            <div class="dash-stat-num">{{ totalRegistrations }}</div>
            <div class="dash-stat-label">Total Attendees</div>
          </div>
        </template>
        <!-- Owner-only private metric -->
        <div v-if="authStore.isOwner" class="dash-stat dash-stat-owner">
          <div class="dash-stat-num">{{ allUsers.length }}</div>
          <div class="dash-stat-label">App Members · Owner Only</div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-num" style="font-size:18px;">{{ authStore.isOrganizer ? 'Organizer' : 'Attendee' }}</div>
          <div class="dash-stat-label">Account Type</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="dash-tabs">
        <button class="dash-tab" :class="{ active: activeTab === 'registrations' }" @click="activeTab = 'registrations'">
          My Registrations
        </button>
        <template v-if="authStore.isOrganizer">
          <button class="dash-tab" :class="{ active: activeTab === 'myEvents' }" @click="activeTab = 'myEvents'">
            My Events
          </button>
          <button class="dash-tab" :class="{ active: activeTab === 'attendees' }" @click="activeTab = 'attendees'">
            Event Attendees
          </button>
        </template>
        <button v-if="authStore.isOwner" class="dash-tab" :class="{ active: activeTab === 'members' }" @click="activeTab = 'members'">
          App Members
        </button>
      </div>

      <div v-if="loading" class="loading-wrap"><div class="spinner"></div></div>

      <!-- ── MY REGISTRATIONS ── -->
      <div v-else-if="activeTab === 'registrations'">
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

      <!-- ── MY EVENTS ── -->
      <div v-else-if="activeTab === 'myEvents'">
        <div v-if="myEvents.length === 0" class="empty-state">
          <div class="empty-title">No events yet</div>
          <p class="empty-text">Create your first event and start managing registrations.</p>
          <router-link to="/create-event" class="btn btn-primary btn-lg">Create Event</router-link>
        </div>
        <div v-else class="dash-list">
          <div v-for="ev in myEvents" :key="ev.id" class="dash-list-item">
            <div class="dli-img-wrap">
              <img v-if="ev.flyerURL && !ev.flyerURL.startsWith('data:')" :src="ev.flyerURL" :alt="ev.title" />
              <div v-else class="dli-img-placeholder">{{ ev.category?.[0]?.toUpperCase() || 'E' }}</div>
            </div>
            <div class="dli-info">
              <router-link :to="`/events/${ev.id}`" class="dli-title">{{ ev.title }}</router-link>
              <div class="dli-meta">
                {{ fmt(ev.dateTime) }} · {{ fmtTime(ev.dateTime) }}
              </div>
              <div class="dli-ticket-bar-wrap">
                <div class="dli-ticket-bar">
                  <div
                    class="dli-ticket-fill"
                    :style="{ width: `${Math.round(((ev.ticketLimit - ev.ticketsRemaining) / ev.ticketLimit) * 100)}%` }"
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

      <!-- ── EVENT ATTENDEES ── -->
      <div v-else-if="activeTab === 'attendees'">
        <div v-if="myEvents.length === 0" class="empty-state">
          <div class="empty-title">No events yet</div>
          <p class="empty-text">Create events to see who registers for them.</p>
        </div>
        <div v-else class="dash-list">
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
              <div v-else-if="!eventRegs[ev.id!] || eventRegs[ev.id!].length === 0"
                style="padding:24px;text-align:center;color:var(--text-muted);font-size:14px;">
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

      <!-- ── APP MEMBERS ── -->
      <div v-else-if="activeTab === 'members'">
        <div class="members-header">
          <h2 style="font-size:18px;font-weight:700;color:var(--text);">All App Members</h2>
          <span class="badge badge-primary">{{ allUsers.length }} total</span>
          <span class="owner-tag">Owner view</span>
        </div>
        <div v-if="allUsers.length === 0" class="empty-state">
          <div class="empty-title">No members yet</div>
        </div>
        <table v-else class="attendee-table" style="margin-top:16px;">
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
                  <div class="small-avatar" :style="{ background: u.role === 'organizer' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'var(--grad-primary)' }">
                    {{ u.name?.[0]?.toUpperCase() || '?' }}
                  </div>
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

    </div>
  </div>
</template>

<style scoped>
/* Stats */
.dash-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}
.dash-stat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px 20px 22px;
  text-align: center;
  box-shadow: var(--shadow-card);
  transition: var(--transition);
  position: relative;
}
.dash-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.dash-stat-owner {
  border: 1px solid rgba(99,102,241,0.3);
  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(251,113,133,0.04));
}
.dash-stat-owner::before {
  content: 'PRIVATE'; position: absolute; top: 8px; right: 10px;
  font-size: 9px; font-weight: 700; color: var(--primary);
  background: rgba(99,102,241,0.12); padding: 2px 6px; border-radius: 4px;
  letter-spacing: 0.8px;
}
.owner-tag {
  font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
  color: var(--primary); background: rgba(99,102,241,0.1);
  padding: 3px 8px; border-radius: var(--radius-full); text-transform: uppercase;
}
.dli-accent-bar {
  width: 4px; height: 40px;
  background: var(--grad-primary);
  border-radius: var(--radius-full); flex-shrink: 0;
}
.dash-stat-num {
  font-size: 30px; font-weight: 800;
  background: var(--grad-primary);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px; line-height: 1.2;
}
.dash-stat-label { font-size: 12px; color: var(--text-muted); font-weight: 500; margin-top: 4px; }

/* Tabs */
.dash-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 2px solid var(--border);
  overflow-x: auto;
}
.dash-tab {
  padding: 12px 20px;
  border: none; background: transparent;
  font-size: 14px; font-weight: 500;
  color: var(--text-muted); cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: var(--transition);
}
.dash-tab:hover { color: var(--primary); }
.dash-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 700; }

/* List items */
.dash-list { display: flex; flex-direction: column; gap: 12px; }
.dash-list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  box-shadow: var(--shadow-card);
  transition: var(--transition);
}
.dash-list-item:hover { box-shadow: var(--shadow-md); border-color: rgba(99,102,241,0.18); }
.dli-icon { font-size: 28px; flex-shrink: 0; }
.dli-img-wrap {
  width: 56px; height: 56px;
  border-radius: var(--radius-sm);
  overflow: hidden; flex-shrink: 0;
  background: var(--surface-2);
}
.dli-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
.dli-img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: var(--grad-primary);
  color: white; font-size: 22px;
}
.dli-info { flex: 1; min-width: 0; }
.dli-title {
  font-size: 15px; font-weight: 700; color: var(--text);
  text-decoration: none; display: block; margin-bottom: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dli-title:hover { color: var(--primary); }
.dli-meta { font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
.dli-ticket-bar-wrap { display: flex; align-items: center; gap: 8px; }
.dli-ticket-bar {
  flex: 1; height: 6px;
  background: var(--surface-2); border-radius: var(--radius-full); overflow: hidden;
}
.dli-ticket-fill {
  height: 100%; background: var(--grad-primary);
  border-radius: var(--radius-full); transition: width 0.6s var(--ease);
}
.dli-ticket-text { font-size: 11px; color: var(--text-muted); white-space: nowrap; font-weight: 500; }
.dli-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* Attendee event cards */
.attendee-event-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  margin-bottom: 12px;
}
.aec-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; cursor: pointer; gap: 12px;
  transition: var(--transition);
}
.aec-header:hover { background: rgba(99,102,241,0.04); }
.aec-event-name { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
.aec-meta { font-size: 13px; color: var(--text-muted); }
.aec-right { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
.aec-reg-badge { text-align: right; }
.aec-reg-num { font-size: 22px; font-weight: 800; color: var(--primary); }
.aec-reg-label { font-size: 12px; color: var(--text-muted); }
.aec-chevron {
  font-size: 22px; color: var(--text-muted);
  transition: transform 0.25s var(--ease);
  transform: rotate(90deg);
}
.aec-chevron.open { transform: rotate(-90deg); }
.aec-body { border-top: 1px solid var(--border); }

/* Members header */
.members-header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }

/* Table */
.attendee-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border);
}
.attendee-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.8px;
  color: var(--text-muted);
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}
.attendee-table td { padding: 13px 16px; border-bottom: 1px solid var(--surface-2); vertical-align: middle; }
.attendee-table tr:last-child td { border-bottom: none; }
.attendee-table tr:hover td { background: rgba(99,102,241,0.03); }
.td-num { font-size: 12px; color: var(--text-muted); font-weight: 600; width: 40px; }
.td-name { font-size: 14px; font-weight: 600; color: var(--text); }
.td-muted { font-size: 13px; color: var(--text-muted); }
.small-avatar {
  width: 32px; height: 32px;
  background: var(--grad-primary);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 700; font-size: 12px;
  flex-shrink: 0;
}
.badge-warning { background: rgba(245,158,11,0.1); color: #b45309; }

@media (max-width: 768px) {
  .dash-list-item { flex-wrap: wrap; }
  .attendee-table th:nth-child(3), .attendee-table td:nth-child(3),
  .attendee-table th:nth-child(5), .attendee-table td:nth-child(5) { display: none; }
}
</style>
