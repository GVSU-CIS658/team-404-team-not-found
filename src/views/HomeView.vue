<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '../stores/eventStore'
import { useAuthStore } from '../stores/authStore'
import { seedEventsIfEmpty } from '../utils/seedEvents'
import EventCard from '../components/EventCard.vue'

const eventStore = useEventStore()
const authStore = useAuthStore()
const router = useRouter()
const searchQuery = ref('')

const animatedEventCount = ref(0)
const animatedUserCount = ref(0)
const animatedVenueCount = ref(0)

function animateCount(target: number, r: { value: number }, duration = 1400) {
  const step = target / (duration / 16)
  const timer = setInterval(() => {
    r.value = Math.min(Math.round(r.value + step), target)
    if (r.value >= target) clearInterval(timer)
  }, 16)
}

onMounted(async () => {
  // Seed only when an organizer is authenticated (so Firestore rules pass)
  if (authStore.isAuthenticated && authStore.user) {
    await seedEventsIfEmpty(authStore.user.uid, authStore.user.name)
  }
  // Performance: lightweight query — only next 6 upcoming events
  await eventStore.fetchUpcomingEvents(6)

  setTimeout(() => {
    animateCount(Math.max(eventStore.upcomingEvents.length, 12), animatedEventCount)
    animateCount(200, animatedUserCount)
    animateCount(15, animatedVenueCount)
  }, 400)

  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
    { threshold: 0.12 }
  )
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el))
})

const upcomingEvents = computed(() =>
  [...eventStore.upcomingEvents]
    .filter(e => new Date(e.dateTime) >= new Date(Date.now() - 12 * 60 * 60 * 1000))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 6)
)

function formatHeroDate(d: Date | string) {
  const date = new Date(d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function handleSearch() {
  router.push(searchQuery.value.trim()
    ? { path: '/events', query: { search: searchQuery.value.trim() } }
    : '/events'
  )
}

const categories = [
  { label: 'Music',      icon: '🎵', color: '#0891b2' },
  { label: 'Food & Drink', icon: '🍺', color: '#b45309' },
  { label: 'Arts',       icon: '🎨', color: '#be185d' },
  { label: 'Sports',     icon: '⚽', color: '#047857' },
  { label: 'Community',  icon: '🤝', color: '#0e7490' },
  { label: 'Education',  icon: '📚', color: '#2563eb' },
]
</script>

<template>
  <!-- ═══════════════════════════ HERO ═══════════════════════════ -->
  <section class="hero">
    <div class="hero-blob blob-1"></div>
    <div class="hero-blob blob-2"></div>
    <div class="hero-blob blob-3"></div>

    <div class="floating-shapes">
      <div class="shape shape-1">🎵</div>
      <div class="shape shape-2">🎟️</div>
      <div class="shape shape-3">🎨</div>
      <div class="shape shape-4">⚡</div>
      <div class="shape shape-5">🏆</div>
    </div>

    <div class="container hero-inner">
      <!-- Left: text + search -->
      <div class="hero-content">
        <div class="hero-badge">
          <span class="pulse-dot"></span>
          Grand Rapids, Michigan
        </div>

        <h1 class="hero-title">
          Discover Amazing
          <span class="hero-title-gradient">Events Near You</span>
        </h1>

        <p class="hero-subtitle">
          From live music at DeVos to craft beer festivals at Founders,
          find and register for the best events in Grand Rapids — all in one place.
        </p>

        <form class="hero-search" @submit.prevent="handleSearch">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search concerts, festivals, workshops..."
            class="hero-search-input"
          />
          <button type="submit" class="btn btn-primary btn-lg hero-search-btn">Search</button>
        </form>

        <div class="hero-quick-links">
          <span class="hero-quick-label">Popular:</span>
          <button
            v-for="cat in categories.slice(0, 4)"
            :key="cat.label"
            class="hero-quick-btn"
            @click="router.push({ path: '/events', query: { cat: cat.label } })"
          >
            {{ cat.icon }} {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Right: card stack (auto-updates with nearest upcoming events) -->
      <div class="hero-visual">
        <div
          v-if="upcomingEvents[1]"
          class="hero-card hero-card-back"
          @click="router.push(`/events/${upcomingEvents[1].id}`)"
        >
          <img :src="upcomingEvents[1].flyerURL || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500&auto=format&fit=crop'" alt="event" />
          <div class="hero-card-body">
            <div class="hero-card-cat">{{ upcomingEvents[1].category }}</div>
            <div class="hero-card-title">{{ upcomingEvents[1].title }}</div>
            <div class="hero-card-date">📅 {{ formatHeroDate(upcomingEvents[1].dateTime) }} · {{ upcomingEvents[1].location }}</div>
          </div>
        </div>
        <div
          v-if="upcomingEvents[0]"
          class="hero-card hero-card-front"
          @click="router.push(`/events/${upcomingEvents[0].id}`)"
        >
          <img :src="upcomingEvents[0].flyerURL || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500&auto=format&fit=crop'" alt="event" />
          <div class="hero-card-body">
            <div class="hero-card-cat">{{ upcomingEvents[0].category }}</div>
            <div class="hero-card-title">{{ upcomingEvents[0].title }}</div>
            <div class="hero-card-date">📅 {{ formatHeroDate(upcomingEvents[0].dateTime) }} · {{ upcomingEvents[0].location }}</div>
          </div>
        </div>
        <div class="hero-stat-pill pill-1">
          <span>🎟️</span>
          <div>
            <div class="pill-num">{{ animatedEventCount }}+</div>
            <div class="pill-lbl">Events</div>
          </div>
        </div>
        <div class="hero-stat-pill pill-2">
          <span>⭐</span>
          <div>
            <div class="pill-num">4.9</div>
            <div class="pill-lbl">Rating</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats band -->
    <div class="hero-stats-band">
      <div class="container">
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="stat-num">{{ animatedEventCount }}+</span>
            <span class="stat-lbl">Live Events</span>
          </div>
          <div class="stat-div"></div>
          <div class="hero-stat">
            <span class="stat-num">{{ animatedUserCount }}+</span>
            <span class="stat-lbl">Members</span>
          </div>
          <div class="stat-div"></div>
          <div class="hero-stat">
            <span class="stat-num">{{ animatedVenueCount }}+</span>
            <span class="stat-lbl">Venues</span>
          </div>
          <div class="stat-div"></div>
          <div class="hero-stat">
            <span class="stat-num">Free</span>
            <span class="stat-lbl">To Register</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═════════════════════════ CATEGORIES ═════════════════════════ -->
  <section class="section-white">
    <div class="container">
      <div class="section-head">
        <div class="section-label">Browse by Category</div>
        <h2 class="section-title">What Are You Into?</h2>
        <p class="section-subtitle">Explore Grand Rapids events across all categories.</p>
      </div>
      <div class="cat-grid">
        <button
          v-for="cat in categories"
          :key="cat.label"
          class="cat-card fade-up"
          :style="{ '--cat-color': cat.color }"
          @click="router.push({ path: '/events', query: { cat: cat.label } })"
        >
          <div class="cat-icon">{{ cat.icon }}</div>
          <div class="cat-name">{{ cat.label }}</div>
          <div class="cat-arr">→</div>
        </button>
      </div>
    </div>
  </section>

  <!-- ══════════════════════ UPCOMING EVENTS ══════════════════════ -->
  <section class="section-bg">
    <div class="container">
      <div class="section-row-header">
        <div>
          <div class="section-label">🔥 Don't Miss Out</div>
          <h2 class="section-title" style="margin-bottom:0">Upcoming Events</h2>
        </div>
        <router-link to="/events" class="btn btn-secondary">View All →</router-link>
      </div>

      <div v-if="eventStore.loading" class="events-grid">
        <div v-for="n in 6" :key="n" class="skel-card">
          <div class="skeleton" style="height:200px;"></div>
          <div style="padding:16px">
            <div class="skeleton" style="height:18px; margin-bottom:8px; border-radius:4px;"></div>
            <div class="skeleton" style="height:14px; width:60%; border-radius:4px;"></div>
          </div>
        </div>
      </div>

      <div v-else-if="upcomingEvents.length === 0" class="empty-state">
        <span class="empty-icon">🎪</span>
        <div class="empty-title">No upcoming events yet</div>
        <p class="empty-text">Check back soon — or create one yourself!</p>
        <router-link v-if="authStore.isOrganizer" to="/create-event" class="btn btn-primary btn-lg">Create Event</router-link>
      </div>

      <div v-else class="events-grid">
        <EventCard
          v-for="(event, i) in upcomingEvents"
          :key="event.id"
          :event="event"
          :style="{ animationDelay: `${i * 70}ms` }"
        />
      </div>
    </div>
  </section>

  <!-- ═══════════════════════════ FEATURES ═══════════════════════ -->
  <section class="section-white">
    <div class="container">
      <div class="section-head" style="text-align:center">
        <div class="section-label">Why Schedulr</div>
        <h2 class="section-title">Everything for Grand Rapids Events</h2>
      </div>
      <div class="feat-grid">
        <div class="feat-card fade-up" v-for="feat in features" :key="feat.title">
          <div class="feat-icon" :style="{ background: feat.grad }">{{ feat.emoji }}</div>
          <h3 class="feat-title">{{ feat.title }}</h3>
          <p class="feat-text">{{ feat.text }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════════════════════════ CTA ════════════════════════ -->
  <section class="cta-sec">
    <div class="cta-blob cb1"></div>
    <div class="cta-blob cb2"></div>
    <div class="container" style="position:relative;z-index:1;text-align:center">
      <h2 class="cta-title">Ready to Experience Grand Rapids?</h2>
      <p class="cta-sub">Join hundreds of locals discovering events in West Michigan.</p>
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
        <router-link to="/events" class="btn btn-xl cta-btn-white">Browse Events 🎟️</router-link>
        <router-link v-if="!authStore.isAuthenticated" to="/signup" class="btn btn-xl cta-btn-outline">Create Account →</router-link>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
const features = [
  { emoji: '🎟️', title: 'Easy Registration',        grad: 'linear-gradient(135deg,#0891b2,#22d3ee)', text: 'Register for any event in one click. Real-time ticket availability so you never miss limited spots.' },
  { emoji: '📅', title: 'Calendar View',              grad: 'linear-gradient(135deg,#f59e0b,#f97316)', text: 'Visual monthly calendar showing all Grand Rapids events. Never double-book again.' },
  { emoji: '🗓️', title: 'Google Calendar Sync',      grad: 'linear-gradient(135deg,#10b981,#06b6d4)', text: 'Add any event directly to your Google Calendar with one tap. Stay organized everywhere.' },
  { emoji: '✨', title: 'Organizer Dashboard',        grad: 'linear-gradient(135deg,#0e7490,#0ea5e9)', text: 'Create events with flyer photos, manage ticket capacity, and track registrations easily.' },
  { emoji: '🔒', title: 'Secure & Reliable',         grad: 'linear-gradient(135deg,#06b6d4,#0284c7)', text: 'Powered by Firebase with role-based access control. Your data is always safe and accurate.' },
  { emoji: '🏙️', title: 'Grand Rapids Focused',     grad: 'linear-gradient(135deg,#f97316,#f59e0b)', text: 'Curated for West Michigan — from ArtPrize to Founders, from GVSU to downtown GR.' },
]
</script>

<style scoped>
/* ─── Hero ────────────────────────────────────────── */
.hero {
  background: var(--grad-hero);
  position: relative;
  overflow: hidden;
}

.hero-blob { position: absolute; border-radius: 50%; filter: blur(72px); pointer-events: none; animation: blob 12s ease-in-out infinite; }
.blob-1 { width: 600px; height: 600px; background: rgba(8,145,178,.32); top: -200px; right: -100px; }
.blob-2 { width: 400px; height: 400px; background: rgba(34,211,238,.22); bottom: 40px; left: -80px; animation-delay: -4s; }
.blob-3 { width: 300px; height: 300px; background: rgba(245,158,11,.18); top: 35%; left: 42%; animation-delay: -8s; }

.floating-shapes { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.shape { position: absolute; font-size: 28px; opacity: .18; animation: float 7s ease-in-out infinite; }
.shape-1 { top: 15%; left: 7%;  animation-duration: 6s; }
.shape-2 { top: 60%; left: 5%;  animation-duration: 8s; animation-delay: -2s; }
.shape-3 { top: 20%; right:12%; animation-duration: 7s; animation-delay: -1s; }
.shape-4 { top: 70%; right: 8%; animation-duration: 9s; animation-delay: -3s; }
.shape-5 { top: 40%; left:50%;  animation-duration: 6.5s; animation-delay: -1.5s; }

.hero-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  padding-top: 80px;
  position: relative;
  z-index: 1;
}
.hero-content { padding-bottom: 72px; }

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: var(--radius-full);
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,.9);
  margin-bottom: 24px;
  backdrop-filter: blur(8px);
}
.pulse-dot {
  width: 8px; height: 8px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse-ring 2s ease-out infinite;
  flex-shrink: 0;
}

.hero-title {
  font-size: clamp(36px, 5vw, 58px);
  font-weight: 900;
  color: white;
  line-height: 1.08;
  letter-spacing: -2px;
  margin-bottom: 20px;
}
.hero-title-gradient {
  display: block;
  background: linear-gradient(135deg, #22d3ee, #f59e0b, #22d3ee);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 4s ease infinite;
}

.hero-subtitle {
  font-size: 17px;
  color: rgba(255,255,255,.7);
  line-height: 1.7;
  margin-bottom: 36px;
  max-width: 500px;
}

.hero-search {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,.96);
  border-radius: var(--radius-lg);
  padding: 6px 6px 6px 18px;
  gap: 12px;
  box-shadow: 0 24px 48px rgba(0,0,0,.25);
  margin-bottom: 20px;
  max-width: 520px;
}
.search-icon { font-size: 18px; }
.hero-search-input {
  flex: 1; border: none; background: transparent;
  font-size: 15px; color: var(--text); outline: none;
  box-shadow: none !important;
}
.hero-search-btn { flex-shrink: 0; border-radius: 14px !important; }

.hero-quick-links { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hero-quick-label { font-size: 13px; color: rgba(255,255,255,.5); font-weight: 500; }
.hero-quick-btn {
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.2);
  color: rgba(255,255,255,.85);
  border-radius: var(--radius-full);
  padding: 5px 14px;
  font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}
.hero-quick-btn:hover { background: rgba(255,255,255,.22); color: white; }

/* Card stack */
.hero-visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 72px;
  min-height: 360px;
}
.hero-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,.3);
  width: 290px;
  position: absolute;
}
.hero-card img { height: 155px; width: 100%; object-fit: cover; }
.hero-card-body { padding: 14px 16px 16px; }
.hero-card-cat { font-size: 11px; font-weight: 700; color: var(--primary); background: rgba(8,145,178,.1); border-radius: var(--radius-full); padding: 2px 8px; display: inline-block; margin-bottom: 6px; }
.hero-card { cursor: pointer; transition: transform .3s var(--ease-bounce), box-shadow .3s var(--ease); }
.hero-card-front:hover { transform: rotate(4deg) translate(30px, -24px) scale(1.02); }
.hero-card-back:hover  { transform: rotate(-5deg) translate(-30px, 16px) scale(1.02); }
.hero-card-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.hero-card-date { font-size: 12px; color: var(--text-muted); }
.hero-card-back  { transform: rotate(-5deg) translate(-30px, 20px); z-index: 1; }
.hero-card-front { transform: rotate(4deg) translate(30px, -20px); z-index: 2; }

.hero-stat-pill {
  position: absolute;
  background: rgba(255,255,255,.95);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-full);
  padding: 10px 16px;
  display: flex; align-items: center; gap: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
  animation: float 5s ease-in-out infinite;
  z-index: 3;
  font-size: 22px;
}
.pill-1 { top: 20px;   left: -10px;  animation-delay: 0s; }
.pill-2 { bottom: 90px; right: -10px; animation-delay: -2.5s; }
.pill-num  { font-size: 17px; font-weight: 800; color: var(--text); line-height: 1.2; }
.pill-lbl  { font-size: 11px; color: var(--text-muted); font-weight: 500; }

/* Stats band */
.hero-stats-band {
  background: rgba(0,0,0,.22);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255,255,255,.1);
  padding: 24px 0;
}
.hero-stats { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; }
.hero-stat { text-align: center; padding: 0 36px; }
.stat-num { display: block; font-size: 27px; font-weight: 800; color: white; letter-spacing: -1px; }
.stat-lbl { font-size: 12px; color: rgba(255,255,255,.55); font-weight: 500; }
.stat-div { width: 1px; height: 36px; background: rgba(255,255,255,.14); }

/* ─── Sections ──────────────────────────────────── */
.section-white { padding: 72px 0; background: white; }
.section-bg    { padding: 72px 0; background: var(--bg); }
.section-head  { text-align: center; margin-bottom: 48px; }
.section-row-header {
  display: flex; align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 36px;
  flex-wrap: wrap; gap: 16px;
}

/* ─── Categories ─────────────────────────────── */
.cat-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 16px; }
.cat-card {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 28px 12px; background: white;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all .25s var(--ease);
  position: relative; overflow: hidden;
}
.cat-card::before { content:''; position:absolute; inset:0; background:var(--cat-color); opacity:0; transition:var(--transition); }
.cat-card:hover { transform:translateY(-5px); box-shadow:0 16px 40px rgba(0,0,0,.1); border-color:transparent; }
.cat-card:hover::before { opacity:1; }
.cat-card:hover .cat-name, .cat-card:hover .cat-arr { color:white; }
.cat-card:hover .cat-arr { opacity:1; }
.cat-icon { font-size: 32px; position:relative; z-index:1; }
.cat-name { font-size: 12px; font-weight:700; color:var(--text); position:relative; z-index:1; transition:var(--transition); text-align:center; }
.cat-arr  { font-size: 16px; color:var(--text-light); opacity:0; transition:var(--transition); position:relative; z-index:1; }

/* ─── Skeleton ─────────────────────────────── */
.skel-card { background:white; border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; }

/* ─── Features ──────────────────────────────── */
.feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
.feat-card {
  padding: 32px 28px; background:var(--bg);
  border:1px solid var(--border); border-radius:var(--radius-lg);
  transition:var(--transition);
}
.feat-card:hover { background:var(--surface); transform:translateY(-4px); box-shadow:var(--shadow-lg); border-color:rgba(8,145,178,.2); }
.feat-icon {
  width:52px; height:52px; border-radius:var(--radius-md);
  display:flex; align-items:center; justify-content:center;
  font-size:24px; margin-bottom:18px;
  box-shadow:0 8px 20px rgba(0,0,0,.14);
}
.feat-title { font-size:16px; font-weight:700; color:var(--text); margin-bottom:8px; letter-spacing:-.3px; }
.feat-text  { font-size:14px; color:var(--text-muted); line-height:1.7; }

/* ─── CTA ─────────────────────────────────── */
.cta-sec { background:var(--grad-hero); padding:96px 0; text-align:center; position:relative; overflow:hidden; }
.cta-blob { position:absolute; border-radius:50%; filter:blur(80px); opacity:.2; pointer-events:none; }
.cb1 { width:500px; height:500px; background:#0891b2; top:-150px; right:-100px; }
.cb2 { width:400px; height:400px; background:#f59e0b; bottom:-100px; left:-80px; }
.cta-title { font-size:clamp(26px,4vw,46px); font-weight:900; color:white; margin-bottom:16px; letter-spacing:-1.5px; }
.cta-sub   { font-size:17px; color:rgba(255,255,255,.7); margin-bottom:40px; }
.cta-btn-white   { background:white; color:var(--primary); font-weight:700; }
.cta-btn-outline { background:rgba(255,255,255,.12); color:white; border:2px solid rgba(255,255,255,.3); }
.cta-btn-outline:hover { background:rgba(255,255,255,.2); color:white; }

/* ─── Responsive ──────────────────────────── */
@media (max-width:1024px) {
  .cat-grid  { grid-template-columns:repeat(3,1fr); }
  .feat-grid { grid-template-columns:repeat(2,1fr); }
}
@media (max-width:768px) {
  .hero-inner { grid-template-columns:1fr; }
  .hero-content { padding-bottom:0; }
  .hero-visual { display:none; }
  .cat-grid  { grid-template-columns:repeat(2,1fr); }
  .feat-grid { grid-template-columns:1fr; }
  .hero-stats { gap:0; }
  .hero-stat { padding:0 20px; }
}
</style>
