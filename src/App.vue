<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
const router = useRouter()
const mobileOpen = ref(false)

// Theme
const isDark = ref<boolean>(false)

function applyTheme(dark: boolean) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  document.documentElement.classList.add('theme-transitioning')
  setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400)
  localStorage.setItem('schedulr-theme', dark ? 'dark' : 'light')
}

function toggleTheme() {
  isDark.value = !isDark.value
}

watch(isDark, (v) => applyTheme(v))

onMounted(() => {
  authStore.init()
  const saved = localStorage.getItem('schedulr-theme')
  if (saved) {
    isDark.value = saved === 'dark'
  } else {
    isDark.value = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  }
  applyTheme(isDark.value)
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
          <!-- Theme Toggle -->
          <button
            class="theme-toggle"
            @click="toggleTheme"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <span class="theme-toggle-icon" :class="{ dark: isDark }">
              <span class="theme-icon sun">☀️</span>
              <span class="theme-icon moon">🌙</span>
            </span>
          </button>

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

<style scoped>
/* Theme Toggle Button */
.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: all 0.25s ease;
  flex-shrink: 0;
  padding: 0;
}
.theme-toggle:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(8,145,178,0.15);
}
.theme-toggle-icon {
  position: relative;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.theme-toggle-icon.dark {
  transform: rotate(180deg);
}
.theme-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: opacity 0.3s ease;
}
.theme-icon.sun { opacity: 1; }
.theme-icon.moon { opacity: 0; transform: rotate(-180deg); }
.theme-toggle-icon.dark .theme-icon.sun { opacity: 0; }
.theme-toggle-icon.dark .theme-icon.moon { opacity: 1; }

@media (max-width: 768px) {
  .theme-toggle { width: 36px; height: 36px; }
}
</style>
