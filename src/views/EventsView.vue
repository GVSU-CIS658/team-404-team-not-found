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
  { label: 'All',          emoji: '🌟' },
  { label: 'Music',        emoji: '🎵' },
  { label: 'Food & Drink', emoji: '🍺' },
  { label: 'Arts',         emoji: '🎨' },
  { label: 'Sports',       emoji: '⚽' },
  { label: 'Community',    emoji: '🤝' },
  { label: 'Education',    emoji: '📚' },
  { label: 'General',      emoji: '📌' },
]

// Category-themed background images (Unsplash, optimised size)
const CAT_BG: Record<string, string> = {
  'All':          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=60',  // scenic Michigan
  'Music':        'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=60',  // concert crowd
  'Food & Drink': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=60',  // food spread
  'Arts':         'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1200&q=60',     // art gallery
  'Sports':       'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=60',  // stadium
  'Community':    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=60',  // community hands
  'Education':    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=1200&q=60',  // library
  'General':      'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=60',  // GR downtown
}

const CAT_ACCENT: Record<string, string> = {
  'All':          '#4f46e5',
  'Music':        '#7c3aed',
  'Food & Drink': '#d97706',
  'Arts':         '#be185d',
  'Sports':       '#047857',
  'Community':    '#0e7490',
  'Education':    '#4f46e5',
  'General':      '#475569',
}

const CAT_HEADLINE: Record<string, string> = {
  'All':          'All Events in Grand Rapids',
  'Music':        '🎵 Music & Concerts',
  'Food & Drink': '🍺 Food & Drink Experiences',
  'Arts':         '🎨 Arts & Culture',
  'Sports':       '⚽ Sports & Recreation',
  'Community':    '🤝 Community & Social',
  'Education':    '📚 Education & Learning',
  'General':      '📌 General Events',
}

const heroBg = computed(() => CAT_BG[selectedCategory.value] || CAT_BG['All'])
const heroAccent = computed(() => CAT_ACCENT[selectedCategory.value] || '#4f46e5')
const heroHeadline = computed(() => CAT_HEADLINE[selectedCategory.value] || 'Browse Events')

// Watch route query changes
watch(() => route.query, (q) => {
  if (q.search) searchQuery.value = q.search as string
  if (q.cat)    selectedCategory.value = q.cat as string
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
  <!-- ── Category-Themed Hero ── -->
  <div class="page-hero themed-hero" :key="selectedCategory">
    <div class="themed-hero-bg">
      <img :src="heroBg" alt="" loading="lazy" />
    </div>
    <div class="themed-hero-overlay" :style="{ '--accent': heroAccent }"></div>
    <div class="container themed-hero-content">
      <div class="themed-hero-title">{{ heroHeadline }}</div>
      <div class="themed-hero-sub">Discover what's happening in Grand Rapids, Michigan</div>

      <!-- Search bar inside hero -->
      <div class="hero-search-bar">
        <span class="hero-search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search events, venues, categories..."
          class="hero-search-input"
        />
        <button v-if="searchQuery" class="hero-clear-btn" @click="searchQuery = ''">✕</button>
      </div>
    </div>
  </div>

  <div style="padding: 36px 0 72px; background: var(--bg);">
    <div class="container">

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

      <!-- Result count -->
      <div class="ev-result-bar" v-if="!eventStore.loading">
        <span><strong>{{ filteredEvents.length }}</strong> event{{ filteredEvents.length !== 1 ? 's' : '' }}
          <span v-if="selectedCategory !== 'All'"> in <em>{{ selectedCategory }}</em></span>
          <span v-if="searchQuery"> matching "<em>{{ searchQuery }}</em>"</span>
        </span>
        <button v-if="selectedCategory !== 'All' || searchQuery" class="clear-link" @click="clearFilters">
          Clear filters ✕
        </button>
      </div>

      <!-- Loading skeletons -->
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
        <p class="empty-text">Try a different search term or category.</p>
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
/* ── Themed Hero ── */
.themed-hero {
  position: relative;
  min-height: 280px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  transition: background 0.5s ease;
}
.themed-hero-bg {
  position: absolute;
  inset: 0;
  transition: opacity 0.5s ease;
}
.themed-hero-bg img {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: brightness(0.35) saturate(1.3);
  animation: heroFadeIn 0.6s ease both;
}
@keyframes heroFadeIn {
  from { opacity: 0; transform: scale(1.04); }
  to   { opacity: 1; transform: scale(1); }
}

.themed-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(15,23,42,0.72) 0%,
    color-mix(in srgb, var(--accent, #4f46e5) 45%, transparent) 100%
  );
}

.themed-hero-content {
  position: relative;
  z-index: 1;
  padding-bottom: 40px;
  padding-top: 48px;
}
.themed-hero-title {
  font-size: clamp(24px, 4vw, 42px);
  font-weight: 900;
  color: white;
  letter-spacing: -1px;
  line-height: 1.1;
  margin-bottom: 8px;
  text-shadow: 0 2px 12px rgba(0,0,0,0.3);
}
.themed-hero-sub {
  font-size: 15px;
  color: rgba(255,255,255,0.72);
  font-weight: 400;
  margin-bottom: 24px;
}

/* ── Hero search bar ── */
.hero-search-bar {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 560px;
}
.hero-search-icon {
  position: absolute;
  left: 16px;
  font-size: 16px;
  pointer-events: none;
  z-index: 1;
}
.hero-search-input {
  width: 100%;
  padding: 14px 44px 14px 48px;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 15px;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  outline: none;
  transition: var(--transition);
}
.hero-search-input:focus {
  background: white;
  box-shadow: 0 8px 40px rgba(0,0,0,0.3);
}
.hero-clear-btn {
  position: absolute;
  right: 14px;
  background: var(--surface-2);
  border: none; border-radius: 50%;
  width: 22px; height: 22px;
  font-size: 11px; cursor: pointer;
  color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
  transition: var(--transition);
}
.hero-clear-btn:hover { background: var(--surface-3); color: var(--text); }

/* ── Category pills ── */
.cat-pills {
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;
}
.cat-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; background: white;
  border: 1.5px solid var(--border); border-radius: var(--radius-full);
  font-size: 13px; font-weight: 500; color: var(--text-muted);
  cursor: pointer; transition: var(--transition); white-space: nowrap;
}
.cat-pill:hover {
  border-color: var(--primary-light); color: var(--primary); background: rgba(79,70,229,0.04);
}
.cat-pill.active {
  background: var(--primary); border-color: var(--primary);
  color: white; box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}

/* ── Result bar ── */
.ev-result-bar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; font-size: 14px; color: var(--text-muted); flex-wrap: wrap; gap: 8px;
}
.ev-result-bar strong { color: var(--text); }
.ev-result-bar em { font-style: normal; color: var(--primary); }
.clear-link {
  background: none; border: none; cursor: pointer;
  font-size: 13px; color: var(--primary); font-weight: 600; padding: 0;
  transition: var(--transition);
}
.clear-link:hover { color: var(--primary-dark); }
</style>
