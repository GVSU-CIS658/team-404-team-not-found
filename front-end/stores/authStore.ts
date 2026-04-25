import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, collection, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)
  const error = ref('')

  const isAuthenticated = computed(() => !!user.value)
  const isOrganizer = computed(() => user.value?.role === 'organizer')
  // Owner = Rajeshwari (the app owner). Only she sees app-wide member stats.
  const OWNER_EMAIL = 'galugur@mail.gvsu.edu'
  const isOwner = computed(() => user.value?.email?.toLowerCase() === OWNER_EMAIL)

  async function init() {
    return new Promise<void>((resolve) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            user.value = { uid: firebaseUser.uid, ...userDoc.data() } as User
          }
        } else {
          user.value = null
        }
        loading.value = false
        resolve()
      })
    })
  }

  async function signup(name: string, email: string, password: string, role: 'organizer' | 'user') {
    error.value = ''
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      const userData: User = {
        uid: cred.user.uid,
        name,
        email,
        role,
        createdAt: new Date(),
      }
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt,
      })
      user.value = userData
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function login(email: string, password: string) {
    error.value = ''
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid))
      if (userDoc.exists()) {
        user.value = { uid: cred.user.uid, ...userDoc.data() } as User
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function logout() {
    await signOut(auth)
    user.value = null
  }

  async function fetchAllUsers(): Promise<User[]> {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User))
  }

  // Promote the currently signed-in attendee to an organizer in place — no
  // need to create a second account with the same email. Organizers retain
  // full attendee privileges, so this is a one-way "and also" upgrade.
  async function becomeOrganizer() {
    if (!user.value) throw new Error('You must be signed in to become an organizer.')
    if (user.value.role === 'organizer') return // already there, no-op
    await updateDoc(doc(db, 'users', user.value.uid), { role: 'organizer' })
    user.value = { ...user.value, role: 'organizer' }
  }

  return { user, loading, error, isAuthenticated, isOrganizer, isOwner, init, signup, login, logout, fetchAllUsers, becomeOrganizer }
})
