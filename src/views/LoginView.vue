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
    const redirect = route.query.redirect as string
    router.push(redirect || '/dashboard')
  } catch (e: any) {
    error.value = e.message.includes('auth/') ? 'Invalid email or password.' : e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="card auth-card">
      <h1>Welcome Back</h1>
      <p class="subtitle">Sign in to your Schedulr account</p>
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="you@example.com" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="Enter your password" required />
        </div>
        <button type="submit" class="btn-primary btn-block" :disabled="submitting">
          {{ submitting ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
      <p class="auth-footer">
        Don't have an account? <router-link to="/signup">Sign up</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  padding-top: 2rem;
}
.auth-card {
  width: 100%;
  max-width: 440px;
}
.auth-card h1 {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
}
.subtitle {
  color: #64748b;
  margin: 0 0 1.5rem;
}
.btn-block {
  width: 100%;
  padding: 0.85rem;
  font-size: 1rem;
}
.auth-footer {
  text-align: center;
  margin-top: 1.5rem;
  color: #64748b;
}
.auth-footer a {
  color: #4f46e5;
  font-weight: 500;
  text-decoration: none;
}
</style>
