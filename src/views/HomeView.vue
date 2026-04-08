<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useEventStore } from '../stores/eventStore'
import { useAuthStore } from '../stores/authStore'
import EventCard from '../components/EventCard.vue'

const eventStore = useEventStore()
const authStore = useAuthStore()
const upcomingEvents = computed(() => {
  const now = new Date()
  return eventStore.events.filter(e => new Date(e.dateTime) >= now).slice(0, 6)
})

onMounted(() => {
  eventStore.fetchEvents()
})
</script>

<template>
  <div>
    <section class="hero">
      <h1>Discover Events in Grand Rapids</h1>
      <p>Browse, register, and manage local community events all in one place.</p>
      <div class="hero-actions">
        <router-link to="/events" class="btn-primary">Browse Events</router-link>
        <router-link v-if="!authStore.isAuthenticated" to="/signup" class="btn-secondary">Get Started</router-link>
        <router-link v-if="authStore.isOrganizer" to="/create-event" class="btn-secondary">Create Event</router-link>
      </div>
    </section>

    <section class="section" v-if="upcomingEvents.length">
      <div class="page-header">
        <h2>Upcoming Events</h2>
        <p>Don't miss what's happening in Grand Rapids</p>
      </div>
      <div class="grid grid-3">
        <EventCard v-for="event in upcomingEvents" :key="event.id" :event="event" />
      </div>
      <div style="text-align: center; margin-top: 2rem">
        <router-link to="/events" class="btn-secondary">View All Events</router-link>
      </div>
    </section>

    <section class="features">
      <div class="feature-card">
        <div class="feature-icon">&#128203;</div>
        <h3>Browse Events</h3>
        <p>Explore community events with list and calendar views.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">&#127915;</div>
        <h3>Easy Registration</h3>
        <p>Register for events with one click. Track your registrations.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">&#128197;</div>
        <h3>Google Calendar</h3>
        <p>Add events to your Google Calendar to never miss out.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  border-radius: 16px;
  margin-bottom: 3rem;
}
.hero h1 {
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 1rem;
}
.hero p {
  font-size: 1.2rem;
  color: #64748b;
  margin: 0 0 2rem;
}
.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}
.section {
  margin-bottom: 3rem;
}
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}
.feature-card {
  text-align: center;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
}
.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}
.feature-card h3 {
  margin: 0 0 0.5rem;
  color: #1e293b;
}
.feature-card p {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}
</style>
