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
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters.'
    return
  }
  submitting.value = true
  try {
    await authStore.signup(name.value, email.value, password.value, role.value)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e.message.includes('already-in-use')
      ? 'An account with this email already exists.'
      : e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="card auth-card">
      <h1>Create Account</h1>
      <p class="subtitle">Join Schedulr to discover Grand Rapids events</p>
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <form @submit.prevent="handleSignup">
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="name" type="text" placeholder="Your full name" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="you@example.com" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="At least 6 characters" required />
        </div>
        <div class="form-group">
          <label>Account Type</label>
          <select v-model="role">
            <option value="user">Attendee &mdash; Browse and register for events</option>
            <option value="organizer">Organizer &mdash; Create and manage events</option>
          </select>
        </div>
        <button type="submit" class="btn-primary btn-block" :disabled="submitting">
          {{ submitting ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>
      <p class="auth-footer">
        Already have an account? <router-link to="/login">Sign in</router-link>
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
