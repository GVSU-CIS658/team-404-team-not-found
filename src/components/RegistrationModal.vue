<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useRegistrationStore } from '../stores/registrationStore'
import { useEventStore } from '../stores/eventStore'
import type { Event } from '../types'

const props = defineProps<{
  event: Event
  venueId?: string
  venueName?: string
  venueAddress?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'done'): void
}>()

const authStore = useAuthStore()
const regStore = useRegistrationStore()
const eventStore = useEventStore()
const router = useRouter()

const step = ref<1 | 2 | 3>(1)
const qty = ref(1)
const cName = ref('')
const cardNum = ref('')
const expiry = ref('')
const cvv = ref('')
const loading = ref(false)
const err = ref('')

// Price isn't part of current schema — all events are free
const price = 0

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
function formatTime(d: Date | string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const total = computed(() => (price * qty.value).toFixed(2))

function fmtCard(e: Event | any) {
  const v = (e.target.value as string).replace(/\D/g, '').slice(0, 16)
  cardNum.value = v.replace(/(.{4})/g, '$1 ').trim()
}
function fmtExp(e: Event | any) {
  let v = (e.target.value as string).replace(/\D/g, '').slice(0, 4)
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2)
  expiry.value = v
}

function inc() { qty.value = Math.min(props.event.ticketsRemaining, qty.value + 1) }
function dec() { qty.value = Math.max(1, qty.value - 1) }

async function confirm() {
  if (price > 0 && (!cName.value || !cardNum.value || !expiry.value || !cvv.value)) {
    err.value = 'Please fill in all payment fields.'
    return
  }
  loading.value = true
  err.value = ''
  try {
    await regStore.registerForEvent(
      authStore.user!.uid,
      authStore.user!.name,
      props.event.id!,
      props.event.title,
      props.venueId,
      props.venueName,
      props.venueAddress,
    )
    // Refresh event ticket count
    await eventStore.fetchEvent(props.event.id!)
    step.value = 3
  } catch (e: any) {
    err.value = e.message || 'Registration failed.'
  } finally {
    loading.value = false
  }
}

function goToMyEvents() {
  emit('done')
  router.push('/dashboard')
}
</script>

<template>
  <div class="reg-overlay" @click.self="step < 3 && emit('close')">
    <div class="reg-modal">
      <!-- Header -->
      <div class="reg-header">
        <div>
          <div class="reg-kicker">{{ step === 3 ? 'Confirmed' : 'Registration' }}</div>
          <h2 class="reg-title">{{ event.title }}</h2>
        </div>
        <button v-if="step < 3" class="reg-close" @click="emit('close')" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Step indicators -->
      <div v-if="step < 3" class="reg-steps">
        <template v-for="(s, i) in ['Tickets','Payment','Confirm']" :key="s">
          <div class="reg-step">
            <div
              class="reg-step-num"
              :class="{
                active: step === (i + 1),
                done: step > (i + 1),
              }"
            >
              <span v-if="step > (i + 1)">✓</span>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span class="reg-step-lbl" :class="{ active: step === (i + 1) }">{{ s }}</span>
          </div>
          <div v-if="i < 2" class="reg-step-line"></div>
        </template>
      </div>

      <div class="reg-body">
        <!-- ── Step 1 — Tickets ── -->
        <template v-if="step === 1">
          <div class="reg-ticket-card">
            <div class="reg-meta-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>{{ formatDate(event.dateTime) }} · {{ formatTime(event.dateTime) }}</span>
            </div>
            <div class="reg-meta-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{{ venueName || event.location.split(',')[0] }}</span>
            </div>
            <div class="reg-ticket-row">
              <div>
                <div class="reg-ticket-name">General Admission</div>
                <div class="reg-ticket-price">Free</div>
              </div>
              <div class="reg-qty">
                <button class="reg-qty-btn" @click="dec" :disabled="qty <= 1">−</button>
                <span class="reg-qty-num">{{ qty }}</span>
                <button class="reg-qty-btn primary" @click="inc" :disabled="qty >= event.ticketsRemaining">+</button>
              </div>
            </div>
          </div>

          <div class="reg-total">
            <span class="reg-total-lbl">Total</span>
            <span class="reg-total-val">{{ price === 0 ? 'Free' : `$${total}` }}</span>
          </div>

          <button class="reg-cta" @click="step = 2">Continue →</button>
        </template>

        <!-- ── Step 2 — Payment ── -->
        <template v-if="step === 2">
          <div v-if="price === 0" class="reg-free-banner">
            <span class="reg-free-icon">🎉</span>
            This event is free — no payment needed!
          </div>
          <div v-else class="reg-form">
            <div class="reg-field">
              <label>Cardholder name</label>
              <input v-model="cName" placeholder="Alex Rivera" />
            </div>
            <div class="reg-field">
              <label>Card number</label>
              <input :value="cardNum" @input="fmtCard" placeholder="1234 5678 9012 3456" />
            </div>
            <div class="reg-field-row">
              <div class="reg-field">
                <label>Expiry</label>
                <input :value="expiry" @input="fmtExp" placeholder="MM/YY" />
              </div>
              <div class="reg-field">
                <label>CVV</label>
                <input v-model="cvv" type="password" placeholder="•••" maxlength="4" />
              </div>
            </div>
          </div>
          <div v-if="err" class="reg-err">{{ err }}</div>
          <div class="reg-actions">
            <button class="reg-back" @click="step = 1">← Back</button>
            <button class="reg-cta reg-cta-grow" @click="confirm" :disabled="loading">
              {{ loading ? 'Processing…' : (price === 0 ? 'Confirm Registration' : `Pay $${total}`) }}
            </button>
          </div>
        </template>

        <!-- ── Step 3 — Confirmed ── -->
        <template v-if="step === 3">
          <div class="reg-success">
            <div class="reg-success-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 class="reg-success-title">You're registered!</h2>
            <p class="reg-success-text">
              {{ qty }} ticket{{ qty > 1 ? 's' : '' }} confirmed for <strong>{{ event.title }}</strong>.<br/>
              Confirmation sent to {{ authStore.user?.email }}.
            </p>
            <div class="reg-success-meta">
              <div class="reg-meta-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>{{ formatDate(event.dateTime) }} · {{ formatTime(event.dateTime) }}</span>
              </div>
              <div class="reg-meta-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>{{ venueName || event.location.split(',')[0] }}</span>
              </div>
            </div>
            <button class="reg-cta" @click="goToMyEvents">View My Events →</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reg-overlay {
  position: fixed; inset: 0; z-index: 300;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(10px);
  padding: 20px;
  animation: fadeIn 0.2s ease;
}
.reg-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  box-shadow: 0 40px 80px rgba(0,0,0,0.35);
  animation: scaleIn 0.28s var(--ease-bounce, cubic-bezier(0.34,1.56,0.64,1));
}
[data-theme="dark"] .reg-modal {
  background: #1a1217;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.reg-header {
  padding: 22px 28px;
  border-bottom: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
}
.reg-kicker {
  font-size: 11px; font-weight: 700;
  color: #E8614A;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.reg-title {
  font-size: 18px; font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
  line-height: 1.3;
}
.reg-close {
  width: 32px; height: 32px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-muted);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: var(--transition);
}
.reg-close:hover { color: var(--text); border-color: var(--text-light); }

/* Step indicators */
.reg-steps {
  padding: 16px 28px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid var(--border);
}
.reg-step { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.reg-step-num {
  width: 24px; height: 24px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  background: transparent;
  border: 2px solid var(--border);
  color: var(--text-muted);
}
.reg-step-num.active {
  background: #E8614A;
  border-color: #E8614A;
  color: white;
}
.reg-step-num.done {
  background: #E8614A;
  border-color: #E8614A;
  color: white;
}
.reg-step-lbl {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
}
.reg-step-lbl.active { color: var(--text); font-weight: 700; }
.reg-step-line {
  flex: 1; min-width: 16px;
  height: 1px;
  background: var(--border);
}

.reg-body { padding: 24px 28px 28px; }

/* Step 1 */
.reg-ticket-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 18px;
}
.reg-meta-row {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.reg-meta-row svg { flex-shrink: 0; }
.reg-ticket-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 14px;
}
.reg-ticket-name { font-size: 15px; font-weight: 700; color: var(--text); }
.reg-ticket-price { font-size: 14px; font-weight: 700; color: #4A9E6A; margin-top: 2px; }
.reg-qty { display: flex; align-items: center; gap: 12px; }
.reg-qty-btn {
  width: 34px; height: 34px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 18px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  transition: var(--transition);
}
.reg-qty-btn:hover:not(:disabled) { border-color: #E8614A; color: #E8614A; }
.reg-qty-btn.primary {
  background: #E8614A; border-color: #E8614A; color: white;
}
.reg-qty-btn.primary:hover:not(:disabled) { background: #D4503A; }
.reg-qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.reg-qty-num { font-size: 18px; font-weight: 700; color: var(--text); min-width: 24px; text-align: center; }

.reg-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px;
  background: rgba(232, 97, 74, 0.10);
  border-radius: 14px;
  margin-bottom: 18px;
}
.reg-total-lbl { font-size: 15px; font-weight: 600; color: var(--text); }
.reg-total-val { font-size: 22px; font-weight: 800; color: #E8614A; }

.reg-cta {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #E8614A, #F28974);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(232,97,74,0.35);
  transition: transform 0.2s var(--ease), box-shadow 0.2s;
}
.reg-cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 30px rgba(232,97,74,0.45); }
.reg-cta:disabled { opacity: 0.6; cursor: not-allowed; }
.reg-cta-grow { flex: 2; }

/* Step 2 */
.reg-free-banner {
  background: rgba(74,158,106,0.12);
  border: 1px solid rgba(74,158,106,0.3);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 18px;
  text-align: center;
  font-size: 14px;
  color: #4A9E6A;
  font-weight: 600;
}
.reg-free-icon { margin-right: 6px; }

.reg-form { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }
.reg-field { display: flex; flex-direction: column; }
.reg-field label { font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
.reg-field input {
  padding: 11px 14px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border 0.2s, box-shadow 0.2s;
}
.reg-field input:focus {
  border-color: #E8614A;
  box-shadow: 0 0 0 3px rgba(232,97,74,0.15);
}
.reg-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.reg-err {
  font-size: 13px;
  color: #E8614A;
  background: rgba(232,97,74,0.1);
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 14px;
}
.reg-actions { display: flex; gap: 10px; }
.reg-back {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}
.reg-back:hover { border-color: var(--text-light); }

/* Step 3 */
.reg-success { text-align: center; padding: 8px 0 4px; }
.reg-success-circle {
  width: 72px; height: 72px;
  border-radius: 50%;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #E8614A, #F28974);
  display: flex; align-items: center; justify-content: center;
  color: white;
  box-shadow: 0 12px 32px rgba(232,97,74,0.45);
  animation: scaleIn 0.4s var(--ease-bounce, cubic-bezier(0.34,1.56,0.64,1));
}
.reg-success-title { font-size: 24px; font-weight: 800; color: var(--text); margin-bottom: 10px; letter-spacing: -0.5px; }
.reg-success-text { font-size: 14px; color: var(--text-muted); line-height: 1.65; margin-bottom: 22px; }
.reg-success-text strong { color: var(--text); }
.reg-success-meta {
  background: rgba(232,97,74,0.08);
  border: 1px solid rgba(232,97,74,0.2);
  border-radius: 14px;
  padding: 14px 18px;
  margin-bottom: 22px;
  text-align: left;
}
</style>
