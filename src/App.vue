<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
const router = useRouter()
const mobileMenuOpen = ref(false)

onMounted(() => {
  authStore.init()
})

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <div id="app-wrapper">
    <nav class="navbar">
      <div class="nav-container">
        <router-link to="/" class="nav-brand">Schedulr</router-link>
        <button class="mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen">&#9776;</button>
        <div class="nav-links" :class="{ open: mobileMenuOpen }" @click="mobileMenuOpen = false">
          <router-link to="/events">Events</router-link>
          <router-link to="/calendar">Calendar</router-link>
          <template v-if="authStore.isAuthenticated">
            <router-link to="/dashboard">Dashboard</router-link>
            <router-link v-if="authStore.isOrganizer" to="/create-event">Create Event</router-link>
            <button class="btn-logout" @click="handleLogout">Logout</button>
            <span class="user-badge">{{ authStore.user?.name }}</span>
          </template>
          <template v-else>
            <router-link to="/login">Login</router-link>
            <router-link to="/signup" class="btn-signup">Sign Up</router-link>
          </template>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
    <footer class="footer">
      <p>&copy; 2025 Schedulr &mdash; Grand Rapids Event Management</p>
    </footer>
  </div>
</template>
