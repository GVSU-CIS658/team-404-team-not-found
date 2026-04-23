<script setup lang="ts">
import type { Event } from '../types'

defineProps<{ event: Event }>()

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatTime(d: Date) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const CAT_CLASS: Record<string, string> = {
  'Music':       'cat-music',
  'Food & Drink':'cat-food',
  'Arts':        'cat-arts',
  'Sports':      'cat-sports',
  'Community':   'cat-community',
  'Education':   'cat-education',
  'General':     'cat-general',
}

const CAT_GRADIENT: Record<string, string> = {
  'Music':        'linear-gradient(135deg,#4338ca,#6366f1)',
  'Food & Drink': 'linear-gradient(135deg,#be123c,#fb7185)',
  'Arts':         'linear-gradient(135deg,#7c2d92,#c026d3)',
  'Sports':       'linear-gradient(135deg,#0f766e,#14b8a6)',
  'Community':    'linear-gradient(135deg,#1e40af,#3b82f6)',
  'Education':    'linear-gradient(135deg,#4338ca,#8b5cf6)',
  'General':      'linear-gradient(135deg,#334155,#64748b)',
}
</script>

<template>
  <router-link :to="`/events/${event.id}`" class="ev-card">
    <!-- Image / Placeholder -->
    <div class="ev-image">
      <img
        v-if="event.flyerURL && !event.flyerURL.startsWith('data:')"
        :src="event.flyerURL"
        :alt="event.title"
        loading="lazy"
      />
      <img
        v-else-if="event.flyerURL && event.flyerURL.startsWith('data:')"
        :src="event.flyerURL"
        :alt="event.title"
      />
      <div
        v-else
        class="ev-placeholder"
        :style="{ background: CAT_GRADIENT[event.category || 'General'] || CAT_GRADIENT['General'] }"
      >
        <span class="ev-placeholder-letter">{{ (event.category || 'E')[0].toUpperCase() }}</span>
      </div>
      <div class="ev-overlay"></div>
      <div class="ev-date-pill">{{ formatDate(event.dateTime) }}</div>
      <!-- Multi-venue badge -->
      <div v-if="event.venues && event.venues.length > 0" class="ev-multi-venue-badge">
        {{ event.venues.length }} venues
      </div>
    </div>

    <!-- Body -->
    <div class="ev-body">
      <span :class="['ev-cat', CAT_CLASS[event.category || 'General'] || 'cat-general']">
        {{ event.category || 'General' }}
      </span>

      <h3 class="ev-title">{{ event.title }}</h3>

      <div class="ev-meta">
        <div class="ev-meta-row">
          <svg class="ev-meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="ev-meta-text">
            <template v-if="event.venues && event.venues.length > 0">
              {{ event.venues.length }} locations · GR area
            </template>
            <template v-else>
              {{ event.location.split(',')[0] }}
            </template>
          </span>
        </div>
        <div class="ev-meta-row">
          <svg class="ev-meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span class="ev-meta-text">
            <template v-if="event.venues && event.venues.length > 0">
              Multiple dates
            </template>
            <template v-else>
              {{ formatTime(event.dateTime) }}
            </template>
          </span>
        </div>
      </div>

      <div class="ev-footer">
        <span
          v-if="event.ticketsRemaining <= 0"
          class="ticket-pill sold-out"
        >Sold Out</span>
        <span
          v-else-if="event.ticketsRemaining <= event.ticketLimit * 0.2"
          class="ticket-pill low"
        >{{ event.ticketsRemaining }} left</span>
        <span v-else class="ticket-pill ok">{{ event.ticketsRemaining }} tickets</span>

        <span class="ev-view-btn">View →</span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.ev-card {
  display: block;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s var(--ease);
  animation: fadeUp 0.5s var(--ease) both;
}
.ev-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 56px rgba(0,0,0,0.12);
  border-color: rgba(8,145,178,0.25);
  text-decoration: none;
  color: inherit;
}

.ev-image {
  position: relative;
  height: 196px;
  overflow: hidden;
  background: var(--surface-2);
}
.ev-image img {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform 0.6s var(--ease);
}
.ev-card:hover .ev-image img { transform: scale(1.07); }

.ev-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.ev-placeholder-letter {
  font-size: 72px;
  font-weight: 800;
  color: rgba(255,255,255,0.9);
  letter-spacing: -2px;
  font-family: 'Playfair Display', Georgia, serif;
}

.ev-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 55%);
  opacity: 0; transition: var(--transition);
}
.ev-card:hover .ev-overlay { opacity: 1; }

.ev-date-pill {
  position: absolute; top: 12px; left: 12px;
  background: rgba(15,23,42,0.7);
  backdrop-filter: blur(8px);
  color: white; font-size: 11px; font-weight: 700;
  padding: 4px 10px; border-radius: var(--radius-full);
  letter-spacing: 0.2px;
}

/* Multi-venue badge */
.ev-multi-venue-badge {
  position: absolute; top: 12px; right: 12px;
  background: rgba(251,191,36,0.85);
  backdrop-filter: blur(8px);
  color: #78350f; font-size: 10px; font-weight: 700;
  padding: 3px 9px; border-radius: var(--radius-full);
  letter-spacing: 0.2px;
}

.ev-body { padding: 18px 20px 20px; }

.ev-cat {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.5px; text-transform: uppercase;
  padding: 3px 9px; border-radius: var(--radius-full);
  margin-bottom: 10px;
}

.ev-title {
  font-size: 16px; font-weight: 700;
  color: var(--text); line-height: 1.35; letter-spacing: -0.3px; margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.ev-meta { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.ev-meta-row { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); }
.ev-meta-icon { flex-shrink: 0; color: var(--text-light); }
.ev-meta-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ev-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 12px; border-top: 1px solid var(--border);
}

.ticket-pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600;
  padding: 3px 9px; border-radius: var(--radius-full);
}
.ticket-pill.ok       { background: rgba(16,185,129,0.1); color: #059669; }
.ticket-pill.low      { background: rgba(245,158,11,0.1); color: #d97706; }
.ticket-pill.sold-out { background: rgba(239,68,68,0.08); color: var(--danger); }

.ev-view-btn {
  font-size: 13px; font-weight: 600; color: var(--primary);
  opacity: 0; transition: var(--transition);
}
.ev-card:hover .ev-view-btn { opacity: 1; }
</style>
