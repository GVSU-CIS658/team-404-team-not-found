<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '../stores/eventStore'
import { useAuthStore } from '../stores/authStore'

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

const categories = ['Music', 'Food & Drink', 'Arts', 'Sports', 'Community', 'Education', 'General']

function handleFileChange(e: globalThis.Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    flyerFile.value = target.files[0]
  }
}

async function handleSubmit() {
  error.value = ''
  if (!authStore.user) return
  submitting.value = true
  try {
    const id = await eventStore.createEvent(
      {
        title: title.value,
        description: description.value,
        location: location.value,
        dateTime: new Date(dateTime.value),
        ticketLimit: ticketLimit.value,
        ticketsRemaining: ticketLimit.value,
        createdBy: authStore.user.uid,
        createdByName: authStore.user.name,
        flyerURL: '',
        category: category.value,
      },
      flyerFile.value || undefined
    )
    router.push(`/events/${id}`)
  } catch (e: any) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="form-container">
    <div class="page-header">
      <h1>Create Event</h1>
      <p>Share your event with the Grand Rapids community</p>
    </div>
    <div class="card">
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Event Title</label>
          <input v-model="title" type="text" placeholder="e.g. Grand Rapids Art Festival" required />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="description" placeholder="Describe your event..." required></textarea>
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
            <input v-model="location" type="text" placeholder="e.g. Rosa Parks Circle" required />
          </div>
          <div class="form-group">
            <label>Ticket Limit</label>
            <input v-model.number="ticketLimit" type="number" min="1" required />
          </div>
        </div>
        <div class="form-group">
          <label>Event Flyer (optional)</label>
          <input type="file" accept="image/*" @change="handleFileChange" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="router.back()">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? 'Creating...' : 'Create Event' }}
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
