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
    <!-- Background blobs -->
    <div class="auth-bg-blob" style="width:500px;height:500px;background:#4f46e5;top:-200px;right:-150px;"></div>
    <div class="auth-bg-blob" style="width:300px;height:300px;background:#7c3aed;bottom:-100px;left:-80px;animation-delay:-3s;"></div>

    <div class="auth-card">
      <div style="text-align:center; margin-bottom:32px;">
        <div class="auth-icon">🗓️</div>
        <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px;">Welcome back</h1>
        <p style="color:var(--text-muted);font-size:14px;">Sign in to your Schedulr account</p>
      </div>

      <div v-if="error" class="alert alert-error">⚠️ {{ error }}</div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email address</label>
          <input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="Enter your password" required autocomplete="current-password" />
        </div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px;" :disabled="submitting">
          <span v-if="submitting">Signing in…</span>
          <span v-else>Sign In →</span>
        </button>
      </form>

      <p style="text-align:center;margin-top:24px;font-size:14px;color:var(--text-muted);">
        Don't have an account?
        <router-link to="/signup" style="color:var(--primary);font-weight:600;">Sign up free</router-link>
      </p>
    </div>
  </div>
</template>
