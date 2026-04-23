<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '../stores/eventStore'
import { useAuthStore } from '../stores/authStore'
import { seedEventsIfEmpty } from '../utils/seedEvents'

const eventStore = useEventStore()
const authStore = useAuthStore()
const router = useRouter()

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
  if (authStore.isAuthenticated && authStore.user) {
    await seedEventsIfEmpty(authStore.user.uid, authStore.user.name)
  }
  await eventStore.fetchUpcomingEvents(6)

  setTimeout(() => {
    animateCount(Math.max(eventStore.upcomingEvents.length, 6), animatedEventCount)
    animateCount(1200, animatedUserCount)
    animateCount(40, animatedVenueCount)
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

const CAT_COLORS: Record<string, string> = {
  'Music':        '#A064D4',
  'Food & Drink': '#D4824A',
  'Arts':         '#E8614A',
  'Sports':       '#4A8BE8',
  'Community':    '#4A9E6A',
  'Education':    '#E8A84A',
  'General':      '#6b5544',
}

function catColor(c?: string) { return CAT_COLORS[c || 'General'] || CAT_COLORS['General'] }

function monthShort(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
}
function dayNum(d: Date | string) {
  return new Date(d).getDate()
}
function timeShort(d: Date | string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function pctFilled(e: { ticketsRemaining: number; ticketLimit: number }) {
  if (!e.ticketLimit) return 0
  return Math.min(100, Math.max(0, Math.round(((e.ticketLimit - e.ticketsRemaining) / e.ticketLimit) * 100)))
}

const categories = [
  { label: 'Music',        color: CAT_COLORS['Music'] },
  { label: 'Food & Drink', color: CAT_COLORS['Food & Drink'] },
  { label: 'Arts',         color: CAT_COLORS['Arts'] },
  { label: 'Sports',       color: CAT_COLORS['Sports'] },
  { label: 'Community',    color: CAT_COLORS['Community'] },
  { label: 'Education',    color: CAT_COLORS['Education'] },
]

const features = [
  { title: 'Easy Registration',     grad: 'linear-gradient(135deg,#E8614A,#F28974)', text: 'Register for any event in one click. Real-time ticket availability so you never miss limited spots.' },
  { title: 'Calendar View',         grad: 'linear-gradient(135deg,#E8A84A,#F2C078)', text: 'Visual monthly calendar showing all Grand Rapids events. Never double-book again.' },
  { title: 'Google Calendar Sync',  grad: 'linear-gradient(135deg,#4A9E6A,#6ABF8A)', text: 'Add any event directly to your Google Calendar with one tap. Stay organized everywhere.' },
  { title: 'Organizer Dashboard',   grad: 'linear-gradient(135deg,#A064D4,#C48EE8)', text: 'Create events with flyer photos, manage ticket capacity, and track registrations easily.' },
  { title: 'Secure & Reliable',     grad: 'linear-gradient(135deg,#4A8BE8,#78AEF2)', text: 'Powered by Firebase with role-based access control. Your data is always safe and accurate.' },
  { title: 'Grand Rapids Focused',  grad: 'linear-gradient(135deg,#E8614A,#E8A84A)', text: 'Curated for West Michigan — from ArtPrize to Founders, from GVSU to downtown GR.' },
]
</script>

<template>
  <!-- ═══════════════════════════ HERO ═══════════════════════════ -->
  <section class="hero">
    <div class="hero-glow glow-coral"></div>
    <div class="hero-glow glow-purple"></div>
    <div class="hero-glow glow-blue"></div>

    <div class="container hero-inner">
      <div class="hero-badge">
        <span class="pulse-dot"></span>
        GRAND RAPIDS COMMUNITY EVENTS
      </div>

      <h1 class="hero-title">
        Discover &amp; join<br />
        what's <span class="hero-title-gradient">happening</span>
      </h1>

      <p class="hero-subtitle">
        From live music at DeVos to craft beer festivals at Founders — find, register,
        and share the events that make West Michigan unforgettable.
      </p>

      <div class="hero-ctas">
        <router-link to="/events" class="btn-coral">Browse Events →</router-link>
        <router-link to="/calendar" class="btn-glass">Calendar View</router-link>
      </div>

      <div class="hero-stats">
        <div class="hero-stat">
          <span class="stat-num">{{ animatedEventCount }}+</span>
          <span class="stat-lbl">Events This Month</span>
        </div>
        <div class="stat-div"></div>
        <div class="hero-stat">
          <span class="stat-num">{{ animatedUserCount.toLocaleString() }}+</span>
          <span class="stat-lbl">Community Members</span>
        </div>
        <div class="stat-div"></div>
        <div class="hero-stat">
          <span class="stat-num">{{ animatedVenueCount }}+</span>
          <span class="stat-lbl">Local Organizers</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ══════════════════════ UPCOMING EVENTS ══════════════════════ -->
  <section class="section-bg">
    <div class="container">
      <div class="section-row-header">
        <div>
          <div class="section-label">Don't Miss Out</div>
          <h2 class="section-title" style="margin-bottom:0">Upcoming Events</h2>
        </div>
        <router-link to="/events" class="btn btn-secondary">View All →</router-link>
      </div>

      <div v-if="eventStore.loading" class="ue-grid">
        <div v-for="n in 6" :key="n" class="ue-card skel">
          <div class="skeleton" style="height:5px;"></div>
          <div style="padding:20px;">
            <div class="skeleton" style="height:60px;width:60px;border-radius:12px;margin-bottom:16px;"></div>
            <div class="skeleton" style="height:18px;margin-bottom:8px;border-radius:4px;"></div>
            <div class="skeleton" style="height:14px;width:60%;border-radius:4px;"></div>
          </div>
        </div>
      </div>

      <div v-else-if="upcomingEvents.length === 0" class="empty-state">
        <div class="empty-title">No upcoming events yet</div>
        <p class="empty-text">Check back soon — or create one yourself.</p>
        <router-link v-if="authStore.isOrganizer" to="/create-event" class="btn btn-primary btn-lg">Create Event</router-link>
      </div>

      <div v-else class="ue-grid">
        <router-link
          v-for="(event, i) in upcomingEvents"
          :key="event.id"
          :to="`/events/${event.id}`"
          class="ue-card fade-up"
          :style="{ '--ev-color': catColor(event.category), animationDelay: `${i * 70}ms` }"
        >
          <div class="ue-bar"></div>
          <div class="ue-body">
            <div class="ue-top">
              <div class="ue-date" :style="{ background: catColor(event.category) + '1a', color: catColor(event.category) }">
                <div class="ue-month">{{ monthShort(event.dateTime) }}</div>
                <div class="ue-day">{{ dayNum(event.dateTime) }}</div>
              </div>
              <span class="ue-cat">{{ event.category || 'General' }}</span>
            </div>

            <h3 class="ue-title">{{ event.title }}</h3>

            <div class="ue-meta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{{ (event.location || '').split(',')[0] }}</span>
            </div>

            <div class="ue-footer">
              <span class="ue-time">{{ timeShort(event.dateTime) }}</span>
              <span class="ue-sep">·</span>
              <span class="ue-price free">Free</span>
            </div>

            <div class="ue-progress">
              <div class="ue-progress-track">
                <div
                  class="ue-progress-fill"
                  :class="{ hot: pctFilled(event) >= 80 }"
                  :style="{ width: pctFilled(event) + '%', background: pctFilled(event) >= 80 ? 'linear-gradient(90deg,#E8614A,#F28974)' : catColor(event.category) }"
                ></div>
              </div>
              <div class="ue-progress-lbl">
                <span v-if="event.ticketsRemaining <= 0" class="sold-out">Sold Out</span>
                <span v-else>{{ event.ticketsRemaining }} / {{ event.ticketLimit }} left</span>
              </div>
            </div>
          </div>
        </router-link>
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
          <div class="cat-dot" :style="{ background: cat.color }"></div>
          <div class="cat-name">{{ cat.label }}</div>
          <div class="cat-arr">→</div>
        </button>
      </div>
    </div>
  </section>

  <!-- ═══════════════════════════ FEATURES ═══════════════════════ -->
  <section class="section-bg">
    <div class="container">
      <div class="section-head" style="text-align:center">
        <div class="section-label">Why Schedulr</div>
        <h2 class="section-title">Everything for Grand Rapids Events</h2>
      </div>
      <div class="feat-grid">
        <div class="feat-card fade-up" v-for="feat in features" :key="feat.title">
          <div class="feat-icon" :style="{ background: feat.grad }"></div>
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
        <router-link to="/events" class="btn-coral">Browse Events →</router-link>
        <router-link v-if="!authStore.isAuthenticated" to="/signup" class="btn-glass">Create Account</router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ─── Hero (centered, design-file layout) ─────────────── */
.hero {
  position: relative;
  overflow: hidden;
  min-height: 90vh;
  display: flex;
  align-items: center;
  background: var(--grad-hero);
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}
.glow-coral  { width: 620px; height: 620px; background: rgba(232,97,74,0.28);  top: -220px; left: 50%; transform: translateX(-50%); }
.glow-purple { width: 440px; height: 440px; background: rgba(160,100,212,0.22); bottom: -120px; left: -120px; }
.glow-blue   { width: 420px; height: 420px; background: rgba(74,139,232,0.18);  top: 40%; right: -140px; }

.hero-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 80px 24px 80px;
  max-width: 960px;
}

.hero-badge {
  display: inline-flex; align-items: center; gap: 10px;
  background: rgba(232,97,74,0.14);
  border: 1px solid rgba(232,97,74,0.35);
  color: #F28974;
  border-radius: var(--radius-full);
  padding: 8px 18px;
  font-size: 11px; font-weight: 700; letter-spacing: 1.4px;
  margin-bottom: 30px;
  backdrop-filter: blur(8px);
}
.pulse-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #E8614A;
  box-shadow: 0 0 0 0 rgba(232,97,74,0.6);
  animation: pulse-ring 2s ease-out infinite;
  flex-shrink: 0;
}

.hero-title {
  font-size: clamp(40px, 7vw, 80px);
  font-weight: 800;
  color: white;
  line-height: 1.05;
  letter-spacing: -2.5px;
  margin-bottom: 24px;
  font-family: 'Outfit', sans-serif;
}
.hero-title-gradient {
  background: linear-gradient(135deg, #E8614A 0%, #F28974 50%, #E8A84A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 19px;
  color: rgba(255,255,255,0.72);
  line-height: 1.65;
  margin: 0 auto 40px;
  max-width: 640px;
}

.hero-ctas {
  display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;
  margin-bottom: 64px;
}
.btn-coral {
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #E8614A, #F28974);
  color: white; font-weight: 600; font-size: 15px;
  padding: 14px 28px; border-radius: var(--radius-full);
  text-decoration: none;
  box-shadow: 0 8px 24px rgba(232,97,74,0.40);
  transition: transform .25s var(--ease), box-shadow .25s var(--ease);
  border: none;
}
.btn-coral:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(232,97,74,0.55); color: white; text-decoration: none; }

.btn-glass {
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.08);
  color: white; font-weight: 600; font-size: 15px;
  padding: 14px 28px; border-radius: var(--radius-full);
  text-decoration: none;
  border: 1px solid rgba(255,255,255,0.18);
  backdrop-filter: blur(10px);
  transition: var(--transition);
}
.btn-glass:hover { background: rgba(255,255,255,0.14); color: white; text-decoration: none; border-color: rgba(255,255,255,0.3); }

.hero-stats {
  display: flex; align-items: center; justify-content: center;
  flex-wrap: wrap; gap: 0;
  padding-top: 40px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.hero-stat { text-align: center; padding: 0 40px; }
.stat-num {
  display: block;
  font-size: 36px; font-weight: 700;
  background: linear-gradient(135deg, #E8614A, #F28974);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
  margin-bottom: 4px;
}
.stat-lbl { font-size: 12px; color: rgba(255,255,255,0.55); font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; }
.stat-div { width: 1px; height: 40px; background: rgba(255,255,255,0.1); }

/* ─── Sections ──────────────────────────────────── */
.section-white { padding: 80px 0; background: var(--surface); }
.section-bg    { padding: 80px 0; background: var(--bg); }
.section-head  { text-align: center; margin-bottom: 48px; }
.section-row-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 36px; flex-wrap: wrap; gap: 16px;
}

/* ─── Upcoming Event Cards (compact, design-file) ───────── */
.ue-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

.ue-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  display: flex; flex-direction: column;
  transition: all 0.3s var(--ease);
  animation: fadeUp 0.5s var(--ease) both;
}
.ue-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 50px rgba(0,0,0,0.12);
  border-color: var(--ev-color, var(--primary));
  text-decoration: none; color: inherit;
}
.ue-bar {
  height: 5px;
  background: linear-gradient(90deg, var(--ev-color, var(--primary)), color-mix(in srgb, var(--ev-color, var(--primary)) 55%, transparent));
}
.ue-body { padding: 22px 22px 20px; flex: 1; display: flex; flex-direction: column; }

.ue-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 12px; }
.ue-date {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 60px; height: 60px;
  border-radius: 12px;
  line-height: 1;
}
.ue-month { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; margin-bottom: 3px; }
.ue-day   { font-size: 22px; font-weight: 800; }
.ue-cat {
  font-size: 10px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase;
  color: var(--text-muted);
  background: var(--surface-2);
  padding: 4px 10px;
  border-radius: var(--radius-full);
}

.ue-title {
  font-size: 17px; font-weight: 700;
  color: var(--text); line-height: 1.35;
  letter-spacing: -0.3px;
  margin-bottom: 12px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.ue-meta { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }

.ue-footer { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.ue-sep { opacity: 0.5; }
.ue-time { font-weight: 500; }
.ue-price { font-weight: 700; color: var(--text); }
.ue-price.free { color: #4A9E6A; }

.ue-progress { margin-top: auto; }
.ue-progress-track {
  height: 6px; background: var(--surface-2);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 6px;
}
.ue-progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.4s var(--ease);
}
.ue-progress-lbl {
  font-size: 11px; font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}
.ue-progress-lbl .sold-out { color: var(--danger); }

.ue-card.skel { pointer-events: none; }

/* ─── Categories ─────────────────────────────── */
.cat-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 16px; }
.cat-card {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 28px 12px;
  background: var(--surface);
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
.cat-dot { width: 14px; height: 14px; border-radius: 50%; position:relative; z-index:1; box-shadow: 0 0 0 6px rgba(232,97,74,0.08); }
.cat-card:hover .cat-dot { box-shadow: 0 0 0 6px rgba(255,255,255,0.25); background: white !important; }
.cat-name { font-size: 12px; font-weight:700; color:var(--text); position:relative; z-index:1; transition:var(--transition); text-align:center; }
.cat-arr  { font-size: 16px; color:var(--text-light); opacity:0; transition:var(--transition); position:relative; z-index:1; }

/* ─── Features ──────────────────────────────── */
.feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
.feat-card {
  padding: 32px 28px;
  background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  transition: var(--transition);
}
.feat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: rgba(232,97,74,0.25); }
.feat-icon {
  width: 48px; height: 48px; border-radius: 12px;
  margin-bottom: 18px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}
.feat-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 8px; letter-spacing: -0.3px; }
.feat-text  { font-size: 14px; color: var(--text-muted); line-height: 1.7; }

/* ─── CTA ─────────────────────────────────── */
.cta-sec { background: var(--grad-hero); padding: 96px 0; text-align: center; position: relative; overflow: hidden; }
.cta-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.25; pointer-events: none; }
.cb1 { width: 500px; height: 500px; background: #E8614A; top: -150px; right: -100px; }
.cb2 { width: 400px; height: 400px; background: #A064D4; bottom: -100px; left: -80px; }
.cta-title { font-size: clamp(28px,4vw,48px); font-weight: 800; color: white; margin-bottom: 16px; letter-spacing: -1.5px; }
.cta-sub   { font-size: 17px; color: rgba(255,255,255,.7); margin-bottom: 40px; }

/* ─── Responsive ──────────────────────────── */
@media (max-width: 1024px) {
  .ue-grid   { grid-template-columns: repeat(2,1fr); }
  .cat-grid  { grid-template-columns: repeat(3,1fr); }
  .feat-grid { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 768px) {
  .hero-inner { padding: 60px 20px; }
  .ue-grid   { grid-template-columns: 1fr; }
  .cat-grid  { grid-template-columns: repeat(2,1fr); }
  .feat-grid { grid-template-columns: 1fr; }
  .hero-stats { gap: 0; }
  .hero-stat { padding: 0 20px; }
  .stat-div { display: none; }
}
</style>
