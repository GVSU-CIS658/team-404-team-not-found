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
    // If the email already has an account, sign that user in (verifies their password)
    // and — if they picked Organizer — promote them in place. This lets a single
    // email cover both Attendee and Organizer instead of forcing a second account.
    if (e.message.includes('already-in-use')) {
      try {
        await authStore.login(email.value, password.value)
        if (role.value === 'organizer') await authStore.becomeOrganizer()
        router.push('/dashboard')
        return
      } catch (loginErr: any) {
        error.value = 'An account with this email already exists. Sign in with your existing password to continue, or use the Sign in link below.'
      }
    } else {
      error.value = e.message
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-head">
        <div class="auth-brand">Schedulr</div>
        <h1 class="auth-title">Create your account</h1>
        <p class="auth-sub">Start discovering Grand Rapids events</p>
      </div>

      <!-- Pill role toggle -->
      <div class="role-toggle">
        <button
          type="button"
          class="role-pill"
          :class="{ active: role === 'user' }"
          @click="role = 'user'"
        >Attendee</button>
        <button
          type="button"
          class="role-pill"
          :class="{ active: role === 'organizer' }"
          @click="role = 'organizer'"
        >Organizer</button>
      </div>

      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <form @submit.prevent="handleSignup">
        <div class="form-group">
          <label>Full name</label>
          <input v-model="name" type="text" placeholder="Alex Rivera" required autocomplete="name" />
        </div>
        <div class="form-group">
          <label>Email address</label>
          <input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="••••••••" required autocomplete="new-password" />
        </div>
        <button type="submit" class="btn btn-primary btn-lg auth-submit" :disabled="submitting">
          {{ submitting ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="auth-foot">
        Already have an account?
        <router-link to="/login" class="auth-link">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - var(--nav-h, 64px));
  display: flex; align-items: center; justify-content: center;
  padding: 48px 20px;
  background: var(--bg);
}
.auth-card {
  width: 100%; max-width: 460px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 44px 40px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
}
.auth-head { text-align: center; margin-bottom: 28px; }
.auth-brand {
  font-size: 30px; font-weight: 800; letter-spacing: -0.5px;
  background: linear-gradient(135deg, oklch(0.63 0.20 22), oklch(0.72 0.18 40));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; color: transparent;
  margin-bottom: 18px;
}
.auth-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; color: var(--text); }
.auth-sub   { font-size: 14px; color: var(--text-muted); }

.role-toggle {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
  background: var(--surface-2);
  border-radius: 999px;
  padding: 4px;
  margin-bottom: 28px;
}
.role-pill {
  border: none; background: transparent;
  padding: 12px 16px;
  border-radius: 999px;
  font-size: 14px; font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}
.role-pill.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 12px rgba(232,97,74,0.32);
}

.auth-submit { width: 100%; margin-top: 8px; }
.auth-foot   { text-align: center; margin-top: 22px; font-size: 14px; color: var(--text-muted); }
.auth-link   { color: var(--primary); font-weight: 700; }
</style>
