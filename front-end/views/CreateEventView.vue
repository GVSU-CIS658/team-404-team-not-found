<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '../stores/eventStore'
import { useAuthStore } from '../stores/authStore'
import type { Venue } from '../types'
import { v4 as uuidv4 } from 'uuid'

const router = useRouter()
const eventStore = useEventStore()
const authStore = useAuthStore()

const title = ref('')
const description = ref('')
const category = ref('General')
const flyerFile = ref<File | null>(null)
const error = ref('')
const submitting = ref(false)
const multiVenue = ref(false)

const categories = ['Music', 'Food & Drink', 'Arts', 'Sports', 'Community', 'Education', 'General']

// Single-venue fields
const location = ref('')
const dateTime = ref('')
const ticketLimit = ref(50)

// Multi-venue fields
function blankVenue(): Venue {
  return {
    id: uuidv4(),
    name: '',
    address: '',
    dateTime: new Date(),
    ticketLimit: 50,
    ticketsRemaining: 50,
  }
}
const venues = ref<Venue[]>([blankVenue()])
const venueDateTimes = ref<string[]>([''])

function addVenue() {
  venues.value.push(blankVenue())
  venueDateTimes.value.push('')
}

function removeVenue(idx: number) {
  if (venues.value.length > 1) {
    venues.value.splice(idx, 1)
    venueDateTimes.value.splice(idx, 1)
  }
}

function syncVenueDT(idx: number) {
  if (venueDateTimes.value[idx]) {
    venues.value[idx].dateTime = new Date(venueDateTimes.value[idx])
  }
}

function handleFileChange(e: globalThis.Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) flyerFile.value = target.files[0]
}

async function handleSubmit() {
  error.value = ''
  if (!authStore.user) return
  submitting.value = true
  try {
    const preparedVenues = multiVenue.value
      ? venues.value.map((v, i) => ({
          ...v,
          dateTime: venueDateTimes.value[i] ? new Date(venueDateTimes.value[i]) : v.dateTime,
          ticketsRemaining: v.ticketLimit,
        }))
      : undefined

    const id = await eventStore.createEvent(
      {
        title: title.value,
        description: description.value,
        location: multiVenue.value ? (venues.value[0]?.address || '') : location.value,
        dateTime: multiVenue.value
          ? (venueDateTimes.value[0] ? new Date(venueDateTimes.value[0]) : new Date())
          : new Date(dateTime.value),
        ticketLimit: multiVenue.value
          ? venues.value.reduce((s, v) => s + v.ticketLimit, 0)
          : ticketLimit.value,
        ticketsRemaining: multiVenue.value
          ? venues.value.reduce((s, v) => s + v.ticketLimit, 0)
          : ticketLimit.value,
        createdBy: authStore.user.uid,
        createdByName: authStore.user.name,
        flyerURL: '',
        category: category.value,
        venues: preparedVenues,
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
  <div class="create-wrap">
    <div class="page-header">
      <h1>✨ Create Event</h1>
      <p>Share your event with the Grand Rapids community</p>
    </div>

    <div class="create-card">
      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <form @submit.prevent="handleSubmit">

        <!-- ── Basic Info ── -->
        <div class="form-section">
          <div class="form-section-title">📋 Event Details</div>

          <div class="form-group">
            <label>Event Title *</label>
            <input v-model="title" type="text" placeholder="e.g. Grand Rapids Jazz Night" required />
          </div>

          <div class="form-group">
            <label>Description *</label>
            <textarea v-model="description" rows="4" placeholder="Describe your event — what to expect, who it's for, what's included..." required></textarea>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>Category</label>
              <select v-model="category">
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Event Flyer <span class="label-hint">(optional)</span></label>
              <input type="file" accept="image/*" @change="handleFileChange" class="file-input" />
            </div>
          </div>
        </div>

        <!-- ── Venue Toggle ── -->
        <div class="form-section">
          <div class="form-section-title">📍 Venue Setup</div>
          <div class="venue-toggle-row">
            <span class="toggle-label">Single venue</span>
            <button
              type="button"
              class="toggle-switch"
              :class="{ active: multiVenue }"
              @click="multiVenue = !multiVenue"
              :aria-checked="multiVenue"
              role="switch"
            >
              <span class="toggle-thumb"></span>
            </button>
            <span class="toggle-label">Multiple venues</span>
            <span v-if="multiVenue" class="multi-badge">🏟️ Multi-Venue Mode</span>
          </div>

          <!-- Single venue -->
          <template v-if="!multiVenue">
            <div class="form-row-2">
              <div class="form-group">
                <label>Location *</label>
                <input v-model="location" type="text" placeholder="e.g. Rosa Parks Circle, Grand Rapids, MI" required />
              </div>
              <div class="form-group">
                <label>Date &amp; Time *</label>
                <input v-model="dateTime" type="datetime-local" required />
              </div>
            </div>
            <div class="form-group" style="max-width:200px">
              <label>Ticket Limit *</label>
              <input v-model.number="ticketLimit" type="number" min="1" required />
            </div>
          </template>

          <!-- Multi-venue -->
          <template v-else>
            <div
              v-for="(venue, idx) in venues"
              :key="venue.id"
              class="venue-block"
            >
              <div class="venue-block-header">
                <span class="venue-number">Venue {{ idx + 1 }}</span>
                <button
                  v-if="venues.length > 1"
                  type="button"
                  class="venue-remove-btn"
                  @click="removeVenue(idx)"
                >✕ Remove</button>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label>Venue Name *</label>
                  <input v-model="venue.name" type="text" placeholder="e.g. Van Andel Arena" required />
                </div>
                <div class="form-group">
                  <label>Address *</label>
                  <input v-model="venue.address" type="text" placeholder="e.g. 130 W Fulton St, Grand Rapids, MI" required />
                </div>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label>Date &amp; Time *</label>
                  <input
                    v-model="venueDateTimes[idx]"
                    type="datetime-local"
                    required
                    @change="syncVenueDT(idx)"
                  />
                </div>
                <div class="form-group">
                  <label>Ticket Capacity *</label>
                  <input v-model.number="venue.ticketLimit" type="number" min="1" required />
                </div>
              </div>
            </div>

            <button type="button" class="add-venue-btn" @click="addVenue">
              + Add Another Venue
            </button>

            <div class="venue-summary" v-if="venues.length > 1">
              Total capacity across all venues:
              <strong>{{ venues.reduce((s, v) => s + v.ticketLimit, 0) }} tickets</strong>
            </div>
          </template>
        </div>

        <!-- ── Actions ── -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="router.back()">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            <span v-if="submitting">⏳ Creating…</span>
            <span v-else>🚀 Create Event</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.create-wrap {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 0 60px;
}

.create-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 36px 40px;
  box-shadow: var(--shadow-card);
}

/* ── Sections ── */
.form-section {
  margin-bottom: 36px;
  padding-bottom: 36px;
  border-bottom: 1px solid var(--surface-2);
}
.form-section:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }

.form-section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: -0.2px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--coral-subtle);
}
.form-section-title + .form-group,
.form-section-title ~ .form-group { margin-top: 4px; }
/* Ensure strong contrast for labels in light AND dark */
:deep(label) {
  color: var(--text) !important;
  font-weight: 600;
}
:deep(input), :deep(textarea), :deep(select) {
  color: var(--text) !important;
  background: var(--surface);
  border-color: rgba(0,0,0,0.12);
}
[data-theme="dark"] :deep(label) { color: var(--text) !important; }

.label-hint { font-weight: 400; color: var(--text-muted); font-size: 12px; }

.file-input {
  padding: 10px 12px;
  font-size: 13px;
  cursor: pointer;
}

/* ── 2-col grid ── */
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 600px) {
  .form-row-2 { grid-template-columns: 1fr; }
  .create-card { padding: 24px 20px; }
}

/* ── Toggle switch ── */
.venue-toggle-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.toggle-label { font-size: 14px; font-weight: 500; color: var(--text-muted); }
.toggle-switch {
  width: 48px; height: 26px;
  background: var(--surface-3);
  border: none;
  border-radius: 13px;
  cursor: pointer;
  position: relative;
  transition: var(--transition);
  flex-shrink: 0;
}
.toggle-switch.active { background: var(--primary); }
.toggle-thumb {
  position: absolute;
  top: 3px; left: 3px;
  width: 20px; height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s var(--ease);
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
.toggle-switch.active .toggle-thumb { transform: translateX(22px); }
.multi-badge {
  background: rgba(79,70,229,0.1);
  color: var(--primary);
  font-size: 12px; font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(79,70,229,0.2);
}

/* ── Venue blocks ── */
.venue-block {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 22px 24px;
  margin-bottom: 16px;
  position: relative;
  transition: var(--transition);
}
.venue-block:hover { border-color: var(--primary-light); }

.venue-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.venue-number {
  font-size: 13px; font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(79,70,229,0.08);
  padding: 3px 10px;
  border-radius: var(--radius-full);
}
.venue-remove-btn {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: var(--danger);
  font-size: 12px; font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: var(--transition);
}
.venue-remove-btn:hover { background: rgba(239,68,68,0.15); }

.add-venue-btn {
  width: 100%;
  padding: 13px;
  background: transparent;
  border: 2px dashed var(--primary-light);
  border-radius: var(--radius-lg);
  color: var(--primary);
  font-size: 14px; font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  margin-bottom: 12px;
}
.add-venue-btn:hover {
  background: rgba(79,70,229,0.04);
  border-color: var(--primary);
}

.venue-summary {
  font-size: 13px;
  color: var(--text-muted);
  text-align: right;
  padding: 8px 0;
}
.venue-summary strong { color: var(--primary); }

/* ── Actions ── */
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--surface-2);
}
</style>
