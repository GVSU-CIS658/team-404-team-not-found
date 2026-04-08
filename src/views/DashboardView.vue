<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useEventStore } from '../stores/eventStore'
import { useRegistrationStore } from '../stores/registrationStore'
import type { Event } from '../types'

const authStore = useAuthStore()
const eventStore = useEventStore()
const regStore = useRegistrationStore()

const myEvents = ref<Event[]>([])
const activeTab = ref<'registrations' | 'myEvents'>('registrations')
const loading = ref(true)

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

async function handleCancelRegistration(regId: string, eventId: string) {
  if (confirm('Cancel this registration?')) {
    await regStore.cancelRegistration(regId, eventId, authStore.user!.uid)
  }
}

onMounted(async () => {
  if (authStore.user) {
    await regStore.fetchUserRegistrations(authStore.user.uid)
    if (authStore.isOrganizer) {
      myEvents.value = (await eventStore.fetchMyEvents(authStore.user.uid)) || []
    }
  }
  loading.value = false
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Welcome back, {{ authStore.user?.name }}</p>
    </div>

    <div class="stats-row">
      <div class="card stat-card">
        <div class="stat-number">{{ regStore.userRegistrations.length }}</div>
        <div class="stat-label">Registered Events</div>
      </div>
      <div v-if="authStore.isOrganizer" class="card stat-card">
        <div class="stat-number">{{ myEvents.length }}</div>
        <div class="stat-label">Events Created</div>
      </div>
      <div class="card stat-card">
        <div class="stat-number">{{ authStore.user?.role === 'organizer' ? 'Organizer' : 'Attendee' }}</div>
        <div class="stat-label">Account Type</div>
      </div>
    </div>

    <div class="tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'registrations' }"
        @click="activeTab = 'registrations'"
      >
        My Registrations
      </button>
      <button
        v-if="authStore.isOrganizer"
        class="tab-btn"
        :class="{ active: activeTab === 'myEvents' }"
        @click="activeTab = 'myEvents'"
      >
        My Events
      </button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="activeTab === 'registrations'">
      <div v-if="regStore.userRegistrations.length === 0" class="empty-state">
        <p>You haven't registered for any events yet.</p>
        <router-link to="/events" class="btn-primary">Browse Events</router-link>
      </div>
      <div v-else class="list">
        <div v-for="reg in regStore.userRegistrations" :key="reg.id" class="card list-item">
          <div class="list-item-info">
            <h3>
              <router-link :to="`/events/${reg.eventId}`">{{ reg.eventTitle }}</router-link>
            </h3>
            <p class="list-meta">Registered on {{ formatDate(reg.registeredAt) }}</p>
          </div>
          <div class="list-item-actions">
            <router-link :to="`/events/${reg.eventId}`" class="btn-secondary btn-sm">View</router-link>
            <button
              @click="handleCancelRegistration(reg.id!, reg.eventId)"
              class="btn-danger btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'myEvents'">
      <div v-if="myEvents.length === 0" class="empty-state">
        <p>You haven't created any events yet.</p>
        <router-link to="/create-event" class="btn-primary">Create Event</router-link>
      </div>
      <div v-else class="list">
        <div v-for="event in myEvents" :key="event.id" class="card list-item">
          <div class="list-item-info">
            <h3>
              <router-link :to="`/events/${event.id}`">{{ event.title }}</router-link>
            </h3>
            <p class="list-meta">
              {{ formatDate(event.dateTime) }} at {{ formatTime(event.dateTime) }}
              &mdash; {{ event.ticketsRemaining }}/{{ event.ticketLimit }} tickets left
            </p>
          </div>
          <div class="list-item-actions">
            <router-link :to="`/events/${event.id}`" class="btn-secondary btn-sm">View</router-link>
            <router-link :to="`/edit-event/${event.id}`" class="btn-secondary btn-sm">Edit</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}
.stat-card {
  text-align: center;
  padding: 1.5rem;
}
.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #4f46e5;
}
.stat-label {
  color: #64748b;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0;
}
.tab-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  color: #64748b;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.tab-btn:hover {
  color: #1e293b;
}
.tab-btn.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
  font-weight: 600;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.list-item-info h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
}
.list-item-info h3 a {
  color: #1e293b;
  text-decoration: none;
}
.list-item-info h3 a:hover {
  color: #4f46e5;
}
.list-meta {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}
.list-item-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
@media (max-width: 600px) {
  .list-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
