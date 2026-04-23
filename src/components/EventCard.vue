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

const CAT_EMOJI: Record<string, string> = {
  'Music':'🎵','Food & Drink':'🍺','Arts':'🎨',
  'Sports':'⚽','Community':'🤝','Education':'📚','General':'📌',
}

const CAT_GRADIENT: Record<string, string> = {
  'Music':        'linear-gradient(135deg,#4c1d95,#7c3aed)',
  'Food & Drink': 'linear-gradient(135deg,#92400e,#d97706)',
  'Arts':         'linear-gradient(135deg,#831843,#be185d)',
  'Sports':       'linear-gradient(135deg,#064e3b,#047857)',
  'Community':    'linear-gradient(135deg,#0c4a6e,#0e7490)',
  'Education':    'linear-gradient(135deg,#1e1b4b,#4f46e5)',
  'General':      'linear-gradient(135deg,#334155,#475569)',
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
        <span class="ev-placeholder-emoji">{{ CAT_EMOJI[event.category || 'General'] || '📌' }}</span>
      </div>
      <div class="ev-overlay"></div>
      <div class="ev-date-pill">{{ formatDate(event.dateTime) }}</div>
      <!-- Multi-venue badge -->
      <div v-if="event.venues && event.venues.length > 0" class="ev-multi-venue-badge">
        🏟️ {{ event.venues.length }} venues
      </div>
    </div>

    <!-- Body -->
    <div class="ev-body">
      <span :class="['ev-cat', CAT_CLASS[event.category || 'General'] || 'cat-general']">
        {{ CAT_EMOJI[event.category || 'General'] }} {{ event.category || 'General' }}
      </span>

      <h3 class="ev-title">{{ event.title }}</h3>

      <div class="ev-meta">
        <div class="ev-meta-row">
          <span class="ev-meta-icon">📍</span>
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
          <span class="ev-meta-icon">🕐</span>
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
        >⛔ Sold Out</span>
        <span
          v-else-if="event.ticketsRemaining <= event.ticketLimit * 0.2"
          class="ticket-pill low"
        >🔥 {{ event.ticketsRemaining }} left</span>
        <span v-else class="ticket-pill ok">✅ {{ event.ticketsRemaining }} tickets</span>

        <span class="ev-view-btn">View →</span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.ev-card {
  display: block;
  background: white;
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
  border-color: rgba(79,70,229,0.18);
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
.ev-placeholder-emoji {
  font-size: 56px;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
  opacity: 0.9;
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
.ev-meta-icon { font-size: 13px; flex-shrink: 0; }
.ev-meta-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ev-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 12px; border-top: 1px solid var(--surface-2);
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
