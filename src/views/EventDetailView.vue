<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventStore } from '../stores/eventStore'
import { useAuthStore } from '../stores/authStore'
import { useRegistrationStore } from '../stores/registrationStore'
import type { Event } from '../types'

const route = useRoute()
const router = useRouter()
const eventStore = useEventStore()
const authStore = useAuthStore()
const regStore = useRegistrationStore()

const event = ref<Event | null>(null)
const loading = ref(true)
const isRegistered = ref(false)
const registering = ref(false)
const regError = ref('')

const isOwner = computed(() => authStore.user && event.value && event.value.createdBy === authStore.user.uid)

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function googleCalendarLink(ev: Event) {
  const start = new Date(ev.dateTime)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
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
  const reg = regStore.userRegistrations.find((r) => r.eventId === event.value!.id)
  if (reg && authStore.user) {
    await regStore.cancelRegistration(reg.id!, event.value!.id!, authStore.user.uid)
    isRegistered.value = false
    event.value = await eventStore.fetchEvent(route.params.id as string)
  }
}

async function handleDelete() {
  if (confirm('Are you sure you want to delete this event?')) {
    await eventStore.deleteEvent(event.value!.id!)
    router.push('/events')
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
  <div v-if="loading" class="loading">Loading event...</div>
  <div v-else-if="!event" class="empty-state">
    <h2>Event not found</h2>
    <router-link to="/events" class="btn-primary">Back to Events</router-link>
  </div>
  <div v-else class="event-detail">
    <div class="event-detail-header">
      <router-link to="/events" class="back-link">&larr; Back to Events</router-link>
      <div v-if="isOwner" class="owner-actions">
        <router-link :to="`/edit-event/${event.id}`" class="btn-secondary btn-sm">Edit</router-link>
        <button @click="handleDelete" class="btn-danger btn-sm">Delete</button>
      </div>
    </div>

    <div class="event-detail-grid">
      <div class="event-detail-main">
        <div class="event-flyer-large" v-if="event.flyerURL">
          <img :src="event.flyerURL" :alt="event.title" />
        </div>
        <h1>{{ event.title }}</h1>
        <span class="badge badge-green">{{ event.category }}</span>
        <div class="event-description">
          <p>{{ event.description }}</p>
        </div>
      </div>

      <div class="event-detail-sidebar">
        <div class="card sidebar-card">
          <div class="detail-item">
            <strong>Location</strong>
            <span>{{ event.location }}</span>
          </div>
          <div class="detail-item">
            <strong>Date</strong>
            <span>{{ formatDate(event.dateTime) }}</span>
          </div>
          <div class="detail-item">
            <strong>Time</strong>
            <span>{{ formatTime(event.dateTime) }}</span>
          </div>
          <div class="detail-item">
            <strong>Tickets</strong>
            <span>{{ event.ticketsRemaining }} / {{ event.ticketLimit }} remaining</span>
          </div>
          <div class="detail-item">
            <strong>Organizer</strong>
            <span>{{ event.createdByName }}</span>
          </div>

          <div v-if="regError" class="alert alert-error" style="margin-top: 1rem">{{ regError }}</div>

          <div class="sidebar-actions">
            <template v-if="isRegistered">
              <div class="alert alert-success">You're registered for this event!</div>
              <button @click="handleCancel" class="btn-danger" style="width: 100%">Cancel Registration</button>
            </template>
            <template v-else-if="event.ticketsRemaining > 0">
              <button @click="handleRegister" class="btn-primary" style="width: 100%" :disabled="registering">
                {{ registering ? 'Registering...' : 'Register Now' }}
              </button>
            </template>
            <div v-else class="alert alert-error">This event is sold out.</div>

            <a
              :href="googleCalendarLink(event)"
              target="_blank"
              rel="noopener"
              class="btn-secondary gcal-btn"
            >
              Add to Google Calendar
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.back-link {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 500;
}
.owner-actions {
  display: flex;
  gap: 0.5rem;
}
.event-detail-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 2rem;
}
@media (max-width: 768px) {
  .event-detail-grid {
    grid-template-columns: 1fr;
  }
}
.event-flyer-large {
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}
.event-flyer-large img {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
}
.event-detail-main h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem;
}
.event-description {
  margin-top: 1.5rem;
  line-height: 1.7;
  color: #475569;
}
.sidebar-card {
  position: sticky;
  top: 5rem;
}
.detail-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.detail-item:last-of-type {
  border-bottom: none;
}
.detail-item strong {
  font-size: 0.85rem;
  color: #64748b;
}
.sidebar-actions {
  margin-top: 1.5rem;
}
.gcal-btn {
  width: 100%;
  text-align: center;
  display: block;
  margin-top: 0.5rem;
  text-decoration: none;
  box-sizing: border-box;
}
</style>
