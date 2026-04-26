<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleLogin() {
  error.value = ''
  submitting.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push((route.query.redirect as string) || '/dashboard')
  } catch (e: any) {
    error.value = e.message.includes('auth/') ? 'Invalid email or password.' : e.message
  } finally {
    submitting.value = false
  }
}

// ─── Forgot-password flow ─────────────────────────────────────
const showReset = ref(false)
const resetEmail = ref('')
const resetSubmitting = ref(false)
const resetMessage = ref('')
const resetError = ref('')

function openReset() {
  resetEmail.value = email.value
  resetMessage.value = ''
  resetError.value = ''
  showReset.value = true
}

async function handleReset() {
  resetMessage.value = ''
  resetError.value = ''
  if (!resetEmail.value) { resetError.value = 'Please enter your email.'; return }
  resetSubmitting.value = true
  try {
    await authStore.resetPassword(resetEmail.value)
    resetMessage.value = `Reset email sent to ${resetEmail.value}. Check your inbox (and spam folder) for the link.`
  } catch (e: any) {
    // Firebase returns auth/user-not-found for unknown emails; for security we
    // show the same generic success-style hint in either case.
    resetMessage.value = `If an account exists for ${resetEmail.value}, a reset email was sent. Check your inbox (and spam folder).`
  } finally {
    resetSubmitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-head">
        <div class="auth-brand">Schedulr</div>
        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-sub">Sign in to access your events</p>
      </div>

      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email address</label>
          <input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="••••••••" required autocomplete="current-password" />
        </div>
        <button type="submit" class="btn btn-primary btn-lg auth-submit" :disabled="submitting">
          {{ submitting ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="auth-foot">
        <button type="button" class="auth-link auth-link-btn" @click="openReset">Forgot password?</button>
      </p>
      <p class="auth-foot" style="margin-top:8px;">
        Don't have an account?
        <router-link to="/signup" class="auth-link">Sign up</router-link>
      </p>
    </div>

    <!-- Forgot-password modal -->
    <div v-if="showReset" class="reset-overlay" @click.self="showReset = false">
      <div class="reset-card">
        <h2 class="reset-title">Reset your password</h2>
        <p class="reset-sub">Enter your email and we'll send you a link to choose a new one.</p>

        <form @submit.prevent="handleReset">
          <div class="form-group">
            <label>Email address</label>
            <input v-model="resetEmail" type="email" placeholder="you@example.com" required autocomplete="email" />
          </div>
          <div v-if="resetMessage" class="alert alert-success" style="margin-bottom:12px;">{{ resetMessage }}</div>
          <div v-if="resetError"   class="alert alert-error"   style="margin-bottom:12px;">{{ resetError }}</div>

          <div class="reset-actions">
            <button type="button" class="btn btn-secondary" @click="showReset = false">Close</button>
            <button type="submit" class="btn btn-primary" :disabled="resetSubmitting">
              {{ resetSubmitting ? 'Sending…' : 'Send reset email' }}
            </button>
          </div>
        </form>
      </div>
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

.auth-submit { width: 100%; margin-top: 8px; }
.auth-foot   { text-align: center; margin-top: 22px; font-size: 14px; color: var(--text-muted); }
.auth-link   { color: var(--primary); font-weight: 700; }
.auth-link-btn { background: none; border: none; cursor: pointer; padding: 0; font: inherit; }

/* Reset-password modal */
.reset-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.reset-card {
  width: 100%; max-width: 440px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px 32px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.4);
}
.reset-title { font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 6px; letter-spacing: -0.3px; }
.reset-sub   { font-size: 14px; color: var(--text-muted); margin-bottom: 20px; }
.reset-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
</style>
