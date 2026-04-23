<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useEventStore } from '../stores/eventStore'
import EventCard from '../components/EventCard.vue'

const eventStore = useEventStore()
const route = useRoute()

const searchQuery = ref((route.query.search as string) || '')
const selectedCategory = ref((route.query.cat as string) || 'All')

const categories = [
  { label: 'All',         emoji: '🌟' },
  { label: 'Music',       emoji: '🎵' },
  { label: 'Food & Drink', emoji: '🍺' },
  { label: 'Arts',        emoji: '🎨' },
  { label: 'Sports',      emoji: '⚽' },
  { label: 'Community',   emoji: '🤝' },
  { label: 'Education',   emoji: '📚' },
  { label: 'General',     emoji: '📌' },
]

// Watch route query changes (e.g., from Home page category click)
watch(() => route.query, (q) => {
  if (q.search) searchQuery.value = q.search as string
  if (q.cat) selectedCategory.value = q.cat as string
})

const filteredEvents = computed(() => {
  let result = eventStore.events
  if (selectedCategory.value !== 'All') {
    result = result.filter(e => e.category === selectedCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q)
    )
  }
  return result
})

onMounted(() => eventStore.fetchEvents())

function clearFilters() {
  searchQuery.value = ''
  selectedCategory.value = 'All'
}
</script>

<template>
  <!-- Page hero -->
  <div class="page-hero">
    <div class="container page-hero-content">
      <div class="page-hero-title">🗓️ Browse Events</div>
      <div class="page-hero-sub">Discover what's happening in Grand Rapids, Michigan</div>
    </div>
  </div>

  <div style="padding: 40px 0 72px; background: var(--bg);">
    <div class="container">

      <!-- Search + filter bar -->
      <div class="ev-toolbar">
        <div class="ev-search-wrap">
          <span class="ev-search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search events, venues, categories..."
            class="ev-search"
          />
          <button v-if="searchQuery" class="ev-clear-btn" @click="searchQuery = ''">✕</button>
        </div>
        <div class="ev-count" v-if="!eventStore.loading">
          <strong>{{ filteredEvents.length }}</strong> event{{ filteredEvents.length !== 1 ? 's' : '' }}
        </div>
      </div>

      <!-- Category pills -->
      <div class="cat-pills">
        <button
          v-for="cat in categories"
          :key="cat.label"
          class="cat-pill"
          :class="{ active: selectedCategory === cat.label }"
          @click="selectedCategory = cat.label"
        >
          <span>{{ cat.emoji }}</span> {{ cat.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="eventStore.loading" class="events-grid">
        <div v-for="n in 6" :key="n" style="background:white; border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden;">
          <div class="skeleton" style="height:196px;"></div>
          <div style="padding:16px;">
            <div class="skeleton" style="height:18px; margin-bottom:10px; border-radius:4px;"></div>
            <div class="skeleton" style="height:14px; width:65%; border-radius:4px;"></div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredEvents.length === 0" class="empty-state">
        <span class="empty-icon">🔍</span>
        <div class="empty-title">No events found</div>
        <p class="empty-text">
          Try a different search term or category.
        </p>
        <button class="btn btn-secondary" @click="clearFilters">Clear Filters</button>
      </div>

      <!-- Events grid -->
      <div v-else class="events-grid">
        <EventCard
          v-for="(event, i) in filteredEvents"
          :key="event.id"
          :event="event"
          :style="{ animationDelay: `${i * 60}ms` }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ev-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.ev-search-wrap {
  flex: 1;
  min-width: 240px;
  position: relative;
  display: flex;
  align-items: center;
}
.ev-search-icon {
  position: absolute;
  left: 16px;
  font-size: 16px;
  pointer-events: none;
}
.ev-search {
  width: 100%;
  padding: 13px 44px 13px 46px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  font-size: 15px;
  background: white;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
  outline: none;
}
.ev-search:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
}
.ev-clear-btn {
  position: absolute;
  right: 14px;
  background: var(--surface-2);
  border: none;
  border-radius: 50%;
  width: 22px; height: 22px;
  font-size: 11px;
  cursor: pointer;
  color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
  transition: var(--transition);
}
.ev-clear-btn:hover { background: var(--surface-3); color: var(--text); }

.ev-count {
  font-size: 14px;
  color: var(--text-muted);
  white-space: nowrap;
}
.ev-count strong { color: var(--text); }

/* Category pills */
.cat-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}
.cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: white;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
}
.cat-pill:hover {
  border-color: var(--primary-light);
  color: var(--primary);
  background: rgba(79,70,229,0.04);
}
.cat-pill.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}
</style>
