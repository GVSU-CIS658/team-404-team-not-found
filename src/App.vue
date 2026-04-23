<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
const router = useRouter()
const mobileOpen = ref(false)

onMounted(() => {
  authStore.init()
})

async function handleLogout() {
  await authStore.logout()
  mobileOpen.value = false
  router.push('/')
}

function closeMobile() {
  mobileOpen.value = false
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}
</script>

<template>
  <div id="app">
    <!-- ── Navbar ── -->
    <nav class="navbar">
      <div class="nav-inner">
        <router-link to="/" class="nav-brand" @click="closeMobile">
          <div class="brand-icon">🗓️</div>
          <span class="brand-name">Schedulr</span>
        </router-link>

        <div class="nav-links" :class="{ 'mobile-open': mobileOpen }" @click="closeMobile">
          <router-link to="/events" class="nav-link">🎟 Events</router-link>
          <router-link to="/calendar" class="nav-link">📅 Calendar</router-link>
          <template v-if="authStore.isAuthenticated">
            <router-link to="/dashboard" class="nav-link">📊 Dashboard</router-link>
            <router-link v-if="authStore.isOrganizer" to="/create-event" class="nav-link">✨ Create Event</router-link>
          </template>
        </div>

        <div class="nav-right">
          <template v-if="authStore.isAuthenticated">
            <div class="user-chip">
              <div class="user-avatar">{{ initials(authStore.user?.name || 'U') }}</div>
              <span class="chip-name" style="font-size:13px;font-weight:500;">{{ authStore.user?.name?.split(' ')[0] }}</span>
            </div>
            <button class="btn btn-secondary btn-sm" @click="handleLogout">Logout</button>
          </template>
          <template v-else>
            <router-link to="/login" class="btn btn-ghost btn-sm" @click="closeMobile">Login</router-link>
            <router-link to="/signup" class="btn btn-primary btn-sm" @click="closeMobile">Sign Up</router-link>
          </template>
        </div>

        <button class="hamburger" @click="mobileOpen = !mobileOpen" aria-label="Toggle menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>

    <!-- ── Main Content ── -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- ── Footer ── -->
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand-name">🗓️ Schedulr</div>
            <p class="footer-tagline">Grand Rapids' premier event discovery and management platform. Find your next great experience.</p>
          </div>
          <div class="footer-col">
            <div class="footer-col-title">Discover</div>
            <router-link to="/events">Browse Events</router-link>
            <router-link to="/calendar">Calendar View</router-link>
            <router-link to="/events?cat=Music">Music</router-link>
            <router-link to="/events?cat=Food+%26+Drink">Food & Drink</router-link>
          </div>
          <div class="footer-col">
            <div class="footer-col-title">Account</div>
            <router-link to="/dashboard">Dashboard</router-link>
            <router-link to="/signup">Create Account</router-link>
            <router-link to="/login">Sign In</router-link>
          </div>
          <div class="footer-col">
            <div class="footer-col-title">About</div>
            <a href="#">About Schedulr</a>
            <a href="#">Contact Us</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
        <hr class="footer-divider" />
        <div class="footer-bottom">
          <span>© 2026 Schedulr — Grand Rapids, Michigan</span>
          <span>Built with ❤️ by 404 Team Not Found &mdash; CIS 658</span>
        </div>
      </div>
    </footer>
  </div>
</template>
