<script setup lang="ts">
import type { Event } from '../types'

defineProps<{ event: Event }>()

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
</script>

<template>
  <router-link :to="`/events/${event.id}`" class="event-card card">
    <div class="event-flyer" v-if="event.flyerURL">
      <img :src="event.flyerURL" :alt="event.title" />
    </div>
    <div class="event-flyer placeholder" v-else>
      <span>&#128197;</span>
    </div>
    <div class="event-info">
      <span class="badge badge-green">{{ event.category || 'General' }}</span>
      <h3>{{ event.title }}</h3>
      <p class="event-meta">&#128205; {{ event.location }}</p>
      <p class="event-meta">&#128197; {{ formatDate(event.dateTime) }} at {{ formatTime(event.dateTime) }}</p>
      <div class="event-tickets">
        <span v-if="event.ticketsRemaining > 0" class="badge badge-green">
          {{ event.ticketsRemaining }} / {{ event.ticketLimit }} tickets left
        </span>
        <span v-else class="badge badge-red">Sold Out</span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.event-card {
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  padding: 0;
  transition: transform 0.2s, box-shadow 0.2s;
}
.event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.event-flyer {
  height: 180px;
  overflow: hidden;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.event-flyer img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.event-flyer.placeholder span {
  font-size: 3rem;
}
.event-info {
  padding: 1.25rem;
}
.event-info h3 {
  margin: 0.5rem 0;
  font-size: 1.1rem;
  color: #1e293b;
}
.event-meta {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #64748b;
}
.event-tickets {
  margin-top: 0.75rem;
}
</style>
