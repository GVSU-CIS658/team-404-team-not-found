<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const role = ref<'user' | 'organizer'>('user')
const error = ref('')
const submitting = ref(false)

async function handleSignup() {
  error.value = ''
  if (password.value.length < 6) { error.value = 'Password must be at least 6 characters.'; return }
  submitting.value = true
  try {
    await authStore.signup(name.value, email.value, password.value, role.value)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e.message.includes('already-in-use') ? 'An account with this email already exists.' : e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-bg-blob" style="width:500px;height:500px;background:#7c3aed;top:-200px;left:-150px;"></div>
    <div class="auth-bg-blob" style="width:350px;height:350px;background:#4f46e5;bottom:-100px;right:-80px;animation-delay:-4s;"></div>

    <div class="auth-card">
      <div style="text-align:center; margin-bottom:32px;">
        <div class="auth-icon">✨</div>
        <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px;">Create your account</h1>
        <p style="color:var(--text-muted);font-size:14px;">Join Schedulr — free forever</p>
      </div>

      <!-- Role selector cards -->
      <div class="role-cards">
        <button
          type="button"
          class="role-card"
          :class="{ active: role === 'user' }"
          @click="role = 'user'"
        >
          <span class="role-emoji">🎟️</span>
          <div class="role-label">Attendee</div>
          <div class="role-desc">Browse & register for events</div>
        </button>
        <button
          type="button"
          class="role-card"
          :class="{ active: role === 'organizer' }"
          @click="role = 'organizer'"
        >
          <span class="role-emoji">✨</span>
          <div class="role-label">Organizer</div>
          <div class="role-desc">Create & manage events</div>
        </button>
      </div>

      <div v-if="error" class="alert alert-error">⚠️ {{ error }}</div>

      <form @submit.prevent="handleSignup">
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="name" type="text" placeholder="Your full name" required autocomplete="name" />
        </div>
        <div class="form-group">
          <label>Email address</label>
          <input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="At least 6 characters" required autocomplete="new-password" />
          <div class="form-hint">Minimum 6 characters</div>
        </div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px;" :disabled="submitting">
          <span v-if="submitting">Creating account…</span>
          <span v-else>Create Account →</span>
        </button>
      </form>

      <p style="text-align:center;margin-top:24px;font-size:14px;color:var(--text-muted);">
        Already have an account?
        <router-link to="/login" style="color:var(--primary);font-weight:600;">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.role-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}
.role-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 12px;
  background: var(--bg);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
  text-align: center;
}
.role-card:hover { border-color: var(--primary-light); background: rgba(79,70,229,0.04); }
.role-card.active { border-color: var(--primary); background: rgba(79,70,229,0.07); }
.role-emoji { font-size: 24px; }
.role-label { font-size: 13px; font-weight: 700; color: var(--text); }
.role-desc  { font-size: 11px; color: var(--text-muted); }
</style>
