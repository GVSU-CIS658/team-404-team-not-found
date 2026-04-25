import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('../views/SignupView.vue'),
    },
    {
      path: '/events',
      name: 'Events',
      component: () => import('../views/EventsView.vue'),
    },
    {
      path: '/events/:id',
      name: 'EventDetail',
      component: () => import('../views/EventDetailView.vue'),
      props: true,
    },
    {
      path: '/create-event',
      name: 'CreateEvent',
      // Create-event is now an inline form on the Dashboard. Keep the route
      // for back-compat and external links, but bounce users to the dashboard
      // with the form auto-opened.
      redirect: { name: 'Dashboard', query: { new: '1' } },
    },
    {
      path: '/edit-event/:id',
      name: 'EditEvent',
      component: () => import('../views/EditEventView.vue'),
      props: true,
      meta: { requiresAuth: true, requiresOrganizer: true },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('../views/CalendarView.vue'),
    },
  ],
})

function getCurrentUser(): Promise<any> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const user = await getCurrentUser()
    if (!user) {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }
  }
})

export default router
