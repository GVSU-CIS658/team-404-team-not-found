<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventStore } from '../stores/eventStore'
import { useAuthStore } from '../stores/authStore'
import type { Event } from '../types'

const route = useRoute()
const router = useRouter()
const eventStore = useEventStore()
const authStore = useAuthStore()

const title = ref('')
const description = ref('')
const location = ref('')
const dateTime = ref('')
const ticketLimit = ref(50)
const category = ref('General')
const flyerFile = ref<File | null>(null)
const error = ref('')
const submitting = ref(false)
const loading = ref(true)
const originalEvent = ref<Event | null>(null)

const categories = ['Music', 'Food & Drink', 'Arts', 'Sports', 'Community', 'Education', 'General']

function handleFileChange(e: globalThis.Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    flyerFile.value = target.files[0]
  }
}

function toLocalDateTimeString(date: Date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

onMounted(async () => {
  const ev = await eventStore.fetchEvent(route.params.id as string)
  if (!ev || ev.createdBy !== authStore.user?.uid) {
    router.push('/events')
    return
  }
  originalEvent.value = ev
  title.value = ev.title
  description.value = ev.description
  location.value = ev.location
  dateTime.value = toLocalDateTimeString(ev.dateTime)
  ticketLimit.value = ev.ticketLimit
  category.value = ev.category
  loading.value = false
})

async function handleSubmit() {
  error.value = ''
  submitting.value = true
  try {
    const ticketsSold = originalEvent.value!.ticketLimit - originalEvent.value!.ticketsRemaining
    const newRemaining = Math.max(0, ticketLimit.value - ticketsSold)
    await eventStore.updateEvent(
      route.params.id as string,
      {
        title: title.value,
        description: description.value,
        location: location.value,
        dateTime: new Date(dateTime.value),
        ticketLimit: ticketLimit.value,
        ticketsRemaining: newRemaining,
        category: category.value,
      },
      flyerFile.value || undefined
    )
    router.push(`/events/${route.params.id}`)
  } catch (e: any) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="loading">Loading...</div>
  <div v-else class="form-container">
    <div class="page-header">
      <h1>Edit Event</h1>
    </div>
    <div class="card">
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Event Title</label>
          <input v-model="title" type="text" required />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="description" required></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date &amp; Time</label>
            <input v-model="dateTime" type="datetime-local" required />
          </div>
          <div class="form-group">
            <label>Category</label>
            <select v-model="category">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Location</label>
            <input v-model="location" type="text" required />
          </div>
          <div class="form-group">
            <label>Ticket Limit</label>
            <input v-model.number="ticketLimit" type="number" min="1" required />
          </div>
        </div>
        <div class="form-group">
          <label>Replace Flyer (optional)</label>
          <input type="file" accept="image/*" @change="handleFileChange" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="router.back()">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-container {
  max-width: 700px;
  margin: 0 auto;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
</style>
