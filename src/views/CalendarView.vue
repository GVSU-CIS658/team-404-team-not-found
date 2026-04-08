<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useEventStore } from '../stores/eventStore'
import type { Event } from '../types'

const eventStore = useEventStore()

const currentDate = ref(new Date())
const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth())

const monthName = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
})

const firstDayOfWeek = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1).getDay()
})

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

function today() {
  currentDate.value = new Date()
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

onMounted(() => {
  eventStore.fetchEvents()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Event Calendar</h1>
      <p>See events at a glance</p>
    </div>

    <div class="calendar-nav">
      <button class="btn-secondary btn-sm" @click="prevMonth">&larr; Prev</button>
      <h2 class="calendar-month">{{ monthName }}</h2>
      <button class="btn-secondary btn-sm" @click="today">Today</button>
      <button class="btn-secondary btn-sm" @click="nextMonth">Next &rarr;</button>
    </div>

    <div class="calendar-grid">
      <div class="calendar-header" v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day">
        {{ day }}
      </div>
      <div
        v-for="(cell, i) in calendarDays"
        :key="i"
        class="calendar-cell"
        :class="{ empty: cell.day === 0, 'has-events': cell.events.length > 0 }"
      >
        <div v-if="cell.day > 0" class="cell-day">{{ cell.day }}</div>
        <div v-for="ev in cell.events.slice(0, 3)" :key="ev.id" class="cell-event">
          <router-link :to="`/events/${ev.id}`">
            <span class="cell-event-time">{{ formatTime(ev.dateTime) }}</span>
            {{ ev.title }}
          </router-link>
        </div>
        <div v-if="cell.events.length > 3" class="cell-more">
          +{{ cell.events.length - 3 }} more
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.calendar-month {
  margin: 0;
  font-size: 1.25rem;
  flex: 1;
  text-align: center;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: white;
}
.calendar-header {
  padding: 0.75rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.85rem;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.calendar-cell {
  min-height: 100px;
  padding: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  font-size: 0.8rem;
}
.calendar-cell:nth-child(7n) {
  border-right: none;
}
.calendar-cell.empty {
  background: #fafafa;
}
.cell-day {
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #1e293b;
}
.cell-event {
  margin-bottom: 0.2rem;
}
.cell-event a {
  display: block;
  padding: 0.15rem 0.3rem;
  background: #eef2ff;
  border-radius: 4px;
  color: #4f46e5;
  text-decoration: none;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-event a:hover {
  background: #e0e7ff;
}
.cell-event-time {
  font-weight: 600;
}
.cell-more {
  font-size: 0.7rem;
  color: #64748b;
  padding: 0.1rem 0.3rem;
}
@media (max-width: 768px) {
  .calendar-cell {
    min-height: 60px;
    padding: 0.25rem;
  }
  .cell-event a {
    font-size: 0.65rem;
  }
}
</style>
