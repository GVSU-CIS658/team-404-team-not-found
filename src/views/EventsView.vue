<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useEventStore } from '../stores/eventStore'
import EventCard from '../components/EventCard.vue'

const eventStore = useEventStore()
const searchQuery = ref('')
const selectedCategory = ref('All')

const categories = ['All', 'Music', 'Food & Drink', 'Arts', 'Sports', 'Community', 'Education', 'General']

const filteredEvents = computed(() => {
  let result = eventStore.events
  if (selectedCategory.value !== 'All') {
    result = result.filter((e) => e.category === selectedCategory.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
    )
  }
  return result
})

onMounted(() => {
  eventStore.fetchEvents()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Events</h1>
      <p>Explore what's happening in Grand Rapids</p>
    </div>

    <div class="filters">
      <input v-model="searchQuery" type="text" placeholder="Search events..." class="search-input" />
      <div class="category-filters">
        <button
          v-for="cat in categories"
          :key="cat"
          class="filter-btn"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <div v-if="eventStore.loading" class="loading">Loading events...</div>
    <div v-else-if="filteredEvents.length === 0" class="empty-state">
      <p>No events found. Check back soon!</p>
    </div>
    <div v-else class="grid grid-3">
      <EventCard v-for="event in filteredEvents" :key="event.id" :event="event" />
    </div>
  </div>
</template>

<style scoped>
.filters {
  margin-bottom: 2rem;
}
.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
  font-family: inherit;
}
.search-input:focus {
  outline: none;
  border-color: #4f46e5;
}
.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.filter-btn {
  padding: 0.4rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-family: inherit;
  transition: all 0.2s;
}
.filter-btn:hover {
  border-color: #4f46e5;
  color: #4f46e5;
}
.filter-btn.active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}
</style>
