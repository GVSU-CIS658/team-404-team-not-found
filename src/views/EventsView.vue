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

// Professional CSS gradients — one consistent pattern style, different colors per category
// All use the same multi-stop diagonal gradient template for visual unity
const CAT_GRAD: Record<string, string> = {
  'All':          'linear-gradient(135deg, #050d1e 0%, #0a1628 40%, #0c1f3a 70%, #050d1e 100%)',
  'Music':        'linear-gradient(135deg, #1e1066 0%, #3b1077 40%, #581c87 70%, #0f0730 100%)',
  'Food & Drink': 'linear-gradient(135deg, #431407 0%, #7c2d12 40%, #9a3412 70%, #240a04 100%)',
  'Arts':         'linear-gradient(135deg, #3f0717 0%, #881337 40%, #be185d 70%, #1f0510 100%)',
  'Sports':       'linear-gradient(135deg, #052e16 0%, #065f46 40%, #047857 70%, #021a0c 100%)',
  'Community':    'linear-gradient(135deg, #082f49 0%, #0c4a6e 40%, #0369a1 70%, #031725 100%)',
  'Education':    'linear-gradient(135deg, #1a1366 0%, #1e40af 40%, #2563eb 70%, #0a0828 100%)',
  'General':      'linear-gradient(135deg, #111827 0%, #1f2937 40%, #374151 70%, #06090f 100%)',
}

const CAT_HEADLINE: Record<string, string> = {
  'All':          'Browse All Events',
  'Music':        'Music & Concerts',
  'Food & Drink': 'Food & Drink Experiences',
  'Arts':         'Arts & Culture',
  'Sports':       'Sports & Recreation',
  'Community':    'Community & Social',
  'Education':    'Education & Learning',
  'General':      'General Events',
}

const heroGrad = computed(() => CAT_GRAD[selectedCategory.value] || CAT_GRAD['All'])
const heroHeadline = computed(() => CAT_HEADLINE[selectedCategory.value] || 'Browse Events')

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
  <!-- ── Themed Hero (CSS gradient, no photos) ── -->
  <div class="page-hero themed-hero" :style="{ background: heroGrad }" :key="selectedCategory">
    <!-- Geometric pattern overlay — consistent across categories -->
    <div class="themed-hero-pattern"></div>
    <!-- Soft glow blobs -->
    <div class="hero-glow hero-glow-1"></div>
    <div class="hero-glow hero-glow-2"></div>

    <div class="container themed-hero-content">
      <div class="themed-hero-badge">
        <span class="hero-badge-dot"></span>
        {{ filteredEvents.length }} upcoming {{ filteredEvents.length === 1 ? 'event' : 'events' }}
      </div>
      <div class="themed-hero-title">{{ heroHeadline }}</div>
      <div class="themed-hero-sub">Discover what's happening in Grand Rapids, Michigan</div>

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

  <div style="padding: 36px 0 72px;">
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

      <!-- Result bar -->
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
        <div v-for="n in 6" :key="n" style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden;">
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
  transition: background 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Subtle geometric SVG overlay — same for every category, creates visual consistency */
.themed-hero-pattern {
  position: absolute;
  inset: 0;
  background-image:
    url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.04'%3E%3Ccircle cx='40' cy='40' r='38'/%3E%3Ccircle cx='40' cy='40' r='26'/%3E%3Ccircle cx='40' cy='40' r='14'/%3E%3C/g%3E%3C/svg%3E"),
    linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.25) 100%);
  opacity: 0.8;
}

/* Soft glow spots for depth */
.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  pointer-events: none;
}
.hero-glow-1 {
  width: 400px; height: 400px;
  background: rgba(34,211,238,0.18);
  top: -100px; right: -80px;
}
.hero-glow-2 {
  width: 320px; height: 320px;
  background: rgba(245,158,11,0.12);
  bottom: -80px; left: 10%;
}

.themed-hero-content {
  position: relative;
  z-index: 1;
  padding-bottom: 40px;
  padding-top: 56px;
  animation: heroContentFade 0.5s ease both;
}
@keyframes heroContentFade {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.themed-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.92);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 999px;
  margin-bottom: 14px;
  letter-spacing: 0.2px;
}
.hero-badge-dot {
  width: 7px; height: 7px;
  background: #22d3ee;
  border-radius: 50%;
  box-shadow: 0 0 12px #22d3ee;
  animation: dotPulse 2s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.55; transform: scale(1.3); }
}

.themed-hero-title {
  font-size: clamp(28px, 4.5vw, 48px);
  font-weight: 900;
  color: white;
  letter-spacing: -1.5px;
  line-height: 1.05;
  margin-bottom: 10px;
  text-shadow: 0 2px 24px rgba(0,0,0,0.35);
}
.themed-hero-sub {
  font-size: 15px;
  color: rgba(255,255,255,0.75);
  font-weight: 400;
  margin-bottom: 26px;
}

/* Hero search */
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
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: var(--radius-lg);
  font-size: 15px;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: white;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  outline: none;
  transition: all 0.25s ease;
}
.hero-search-input::placeholder { color: rgba(255,255,255,0.6); }
.hero-search-input:focus {
  background: rgba(255,255,255,0.18);
  border-color: rgba(34,211,238,0.5);
  box-shadow: 0 0 0 3px rgba(34,211,238,0.15), 0 8px 32px rgba(0,0,0,0.2);
}
.hero-clear-btn {
  position: absolute;
  right: 14px;
  background: rgba(255,255,255,0.18);
  border: none; border-radius: 50%;
  width: 24px; height: 24px;
  font-size: 11px; cursor: pointer;
  color: white;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s ease;
}
.hero-clear-btn:hover { background: rgba(255,255,255,0.3); }

/* Category pills */
.cat-pills {
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;
}
.cat-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 13px; font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}
.cat-pill:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(8,145,178,0.05);
  transform: translateY(-1px);
}
.cat-pill.active {
  background: var(--grad-primary);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 14px rgba(8,145,178,0.35);
}

/* Result bar */
.ev-result-bar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; font-size: 14px; color: var(--text-muted); flex-wrap: wrap; gap: 8px;
}
.ev-result-bar strong { color: var(--text); }
.ev-result-bar em { font-style: normal; color: var(--primary); font-weight: 600; }
.clear-link {
  background: none; border: none; cursor: pointer;
  font-size: 13px; color: var(--primary); font-weight: 600; padding: 0;
  transition: var(--transition);
}
.clear-link:hover { color: var(--primary-dark); }
</style>
