<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useEventStore } from '../stores/eventStore'
import type { Event } from '../types'

const eventStore = useEventStore()

const currentDate = ref(new Date())
const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth())

const monthName = computed(() =>
  currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
)

const daysInMonth = computed(() =>
  new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
)

const firstDayOfWeek = computed(() =>
  new Date(currentYear.value, currentMonth.value, 1).getDay()
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

const calendarDays = computed(() => {
  const days: { day: number; events: Event[] }[] = []
  for (let i = 0; i < firstDayOfWeek.value; i++) {
    days.push({ day: 0, events: [] })
  }
  for (let d = 1; d <= daysInMonth.value; d++) {
    const dayEvents = eventStore.events.filter((e) => {
      const eDate = new Date(e.dateTime)
      return (
        eDate.getFullYear() === currentYear.value &&
        eDate.getMonth() === currentMonth.value &&
        eDate.getDate() === d
      )
    })
    days.push({ day: d, events: dayEvents })
  }
  return days
})

function prevMonth() {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() - 1)
  currentDate.value = d
}
function nextMonth() {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() + 1)
  currentDate.value = d
}
function today() { currentDate.value = new Date() }

function isToday(day: number) {
  if (day === 0) return false
  const now = new Date()
  return (
    day === now.getDate() &&
    currentMonth.value === now.getMonth() &&
    currentYear.value === now.getFullYear()
  )
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

onMounted(() => { eventStore.fetchEvents() })
</script>

<template>
  <div class="cal-page">
    <div class="container">
      <!-- Header -->
      <div class="cal-head">
        <div>
          <h1 class="cal-title">Calendar View</h1>
          <p class="cal-sub">Click any date to see its events</p>
        </div>
        <div class="cal-nav">
          <button class="cal-nav-btn" @click="prevMonth" aria-label="Previous month">‹</button>
          <div class="cal-month">{{ monthName }}</div>
          <button class="cal-nav-btn" @click="nextMonth" aria-label="Next month">›</button>
          <button class="cal-today" @click="today">Today</button>
        </div>
      </div>

      <!-- Grid -->
      <div class="cal-grid">
        <div class="cal-dow" v-for="day in ['SUN','MON','TUE','WED','THU','FRI','SAT']" :key="day">
          {{ day }}
        </div>

        <div
          v-for="(cell, i) in calendarDays"
          :key="i"
          class="cal-cell"
          :class="{ empty: cell.day === 0, today: isToday(cell.day) }"
        >
          <div v-if="cell.day > 0" class="cal-day" :class="{ 'today-pill': isToday(cell.day) }">
            {{ cell.day }}
          </div>
          <router-link
            v-for="ev in cell.events.slice(0, 3)"
            :key="ev.id"
            :to="`/events/${ev.id}`"
            class="cal-chip"
            :style="{
              background: catColor(ev.category) + '1a',
              color: catColor(ev.category),
              borderLeft: `3px solid ${catColor(ev.category)}`,
            }"
            :title="ev.title + ' — ' + formatTime(ev.dateTime)"
          >
            <span class="cal-chip-time">{{ formatTime(ev.dateTime) }}</span>
            <span class="cal-chip-title">{{ ev.title }}</span>
          </router-link>
          <div v-if="cell.events.length > 3" class="cal-more">
            +{{ cell.events.length - 3 }} more
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="cal-legend">
        <div class="cal-legend-item" v-for="(color, label) in CAT_COLORS" :key="label">
          <span class="cal-legend-dot" :style="{ background: color }"></span>
          {{ label }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cal-page {
  padding: 48px 0 80px;
  min-height: calc(100vh - var(--nav-height));
  background: var(--bg);
}

.cal-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}
.cal-title {
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 800;
  color: var(--text);
  letter-spacing: -1.5px;
  margin-bottom: 6px;
}
.cal-sub { font-size: 15px; color: var(--text-muted); }

.cal-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cal-nav-btn {
  width: 40px; height: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 20px;
  display: flex; align-items: center; justify-content: center;
  transition: var(--transition);
}
.cal-nav-btn:hover { border-color: var(--primary); color: var(--primary); }
.cal-month {
  min-width: 160px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.5px;
  padding: 0 12px;
}
.cal-today {
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 14px; font-weight: 600;
  transition: var(--transition);
}
.cal-today:hover { border-color: var(--primary); color: var(--primary); }

/* Grid */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.cal-dow {
  padding: 14px 10px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 1px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}

.cal-cell {
  min-height: 118px;
  padding: 8px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  transition: background 0.2s;
}
.cal-cell:nth-child(7n) { border-right: none; }
.cal-cell.empty { background: var(--surface-2); opacity: 0.5; }
.cal-cell:hover:not(.empty) { background: var(--coral-subtle); }
.cal-cell.today { background: var(--coral-subtle); }

.cal-day {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 2px;
  padding: 2px 4px;
}
.cal-day.today-pill {
  display: inline-flex;
  align-items: center; justify-content: center;
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  padding: 0;
}

.cal-chip {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 6px 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}
.cal-chip:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  text-decoration: none;
}
.cal-chip-time { font-size: 10px; font-weight: 700; opacity: 0.85; }
.cal-chip-title {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cal-more {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
  padding: 2px 6px;
}

/* Legend */
.cal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 24px;
  padding: 18px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
}
.cal-legend-item {
  display: flex; align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
}
.cal-legend-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
}

/* Dark-mode adjustments */
[data-theme="dark"] .cal-chip {
  background-color: rgba(255,255,255,0.04) !important;
}

@media (max-width: 768px) {
  .cal-cell { min-height: 70px; padding: 4px; }
  .cal-chip-title { font-size: 9px; }
  .cal-chip-time { display: none; }
  .cal-day { font-size: 11px; }
  .cal-nav { flex-wrap: wrap; justify-content: flex-start; }
  .cal-month { min-width: 120px; font-size: 18px; }
}
</style>
