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
        Don't have an account?
        <router-link to="/signup" class="auth-link">Sign up</router-link>
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

.auth-submit { width: 100%; margin-top: 8px; }
.auth-foot   { text-align: center; margin-top: 22px; font-size: 14px; color: var(--text-muted); }
.auth-link   { color: var(--primary); font-weight: 700; }
</style>
