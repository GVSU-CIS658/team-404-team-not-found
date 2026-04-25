<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
const router = useRouter()
const mobileOpen = ref(false)
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
          <svg class="brand-mark" width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#A63A2E"/>
                <stop offset="55%" stop-color="#C84C3D"/>
                <stop offset="100%" stop-color="#D46856"/>
              </linearGradient>
            </defs>
            <rect x="2" y="5" width="30" height="27" rx="6" fill="url(#brandGrad)"/>
            <rect x="2" y="5" width="30" height="8" rx="6" fill="rgba(0,0,0,0.18)"/>
            <rect x="9"  y="2" width="3" height="7" rx="1.5" fill="#7A2A22"/>
            <rect x="22" y="2" width="3" height="7" rx="1.5" fill="#7A2A22"/>
            <circle cx="10" cy="20" r="1.6" fill="rgba(255,255,255,0.95)"/>
            <circle cx="17" cy="20" r="1.6" fill="rgba(255,255,255,0.95)"/>
            <circle cx="24" cy="20" r="1.6" fill="rgba(255,255,255,0.95)"/>
            <circle cx="10" cy="26" r="1.6" fill="rgba(255,255,255,0.55)"/>
            <circle cx="17" cy="26" r="1.6" fill="rgba(255,255,255,0.95)"/>
            <circle cx="24" cy="26" r="1.6" fill="rgba(255,255,255,0.55)"/>
          </svg>
          <span class="brand-name">Schedulr</span>
        </router-link>

        <div class="nav-links" :class="{ 'mobile-open': mobileOpen }" @click="closeMobile">
          <router-link to="/events" class="nav-link">Events</router-link>
          <router-link to="/calendar" class="nav-link">Calendar</router-link>
          <template v-if="authStore.isAuthenticated">
            <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
            <router-link v-if="authStore.isOrganizer" to="/create-event" class="nav-link">Create Event</router-link>
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
              <svg class="theme-icon sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              <svg class="theme-icon moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
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
            <div class="footer-brand-name">Schedulr</div>
            <p class="footer-tagline">Grand Rapids' premier event discovery and management platform. Find your next great experience.</p>
          </div>
          <div class="footer-col">
            <div class="footer-col-title">Discover</div>
            <router-link to="/events">Browse Events</router-link>
            <router-link to="/calendar">Calendar View</router-link>
            <router-link to="/events?cat=Music">Music</router-link>
            <router-link :to="{ path: '/events', query: { cat: 'Food & Drink' } }">Food & Drink</router-link>
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
          <span>Built by 404 Team Not Found &mdash; CIS 658</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.brand-mark {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  filter: drop-shadow(0 6px 14px rgba(200, 76, 61, 0.38));
  transition: transform 0.35s var(--ease-bounce, cubic-bezier(0.34, 1.56, 0.64, 1));
}
.nav-brand:hover .brand-mark {
  transform: rotate(-6deg) scale(1.06);
}

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
  color: var(--text);
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
