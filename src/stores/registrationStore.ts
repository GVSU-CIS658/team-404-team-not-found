import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  runTransaction,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Registration } from '../types'

export const useRegistrationStore = defineStore('registrations', () => {
  const userRegistrations = ref<Registration[]>([])
  const loading = ref(false)
  const error = ref('')

  function docToRegistration(id: string, data: any): Registration {
    return {
      id,
      userId: data.userId,
      userName: data.userName || '',
      eventId: data.eventId,
      eventTitle: data.eventTitle || '',
      registeredAt: data.registeredAt?.toDate?.() || new Date(data.registeredAt),
      status: data.status,
    }
  }

  async function registerForEvent(userId: string, userName: string, eventId: string, eventTitle: string) {
    error.value = ''
    try {
      await runTransaction(db, async (transaction) => {
        const eventRef = doc(db, 'events', eventId)
        const eventSnap = await transaction.get(eventRef)
        if (!eventSnap.exists()) throw new Error('Event not found')

        const eventData = eventSnap.data()
        if (eventData.ticketsRemaining <= 0) throw new Error('No tickets remaining')

        transaction.update(eventRef, {
          ticketsRemaining: eventData.ticketsRemaining - 1,
        })

        const regRef = doc(collection(db, 'registrations'))
        transaction.set(regRef, {
          userId,
          userName,
          eventId,
          eventTitle,
          registeredAt: Timestamp.now(),
          status: 'confirmed',
        })
      })
      await fetchUserRegistrations(userId)
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function cancelRegistration(registrationId: string, eventId: string, userId: string) {
    await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'events', eventId)
      const eventSnap = await transaction.get(eventRef)
      if (eventSnap.exists()) {
        transaction.update(eventRef, {
          ticketsRemaining: eventSnap.data().ticketsRemaining + 1,
        })
      }
      transaction.update(doc(db, 'registrations', registrationId), {
        status: 'cancelled',
      })
    })
    await fetchUserRegistrations(userId)
  }

  async function fetchUserRegistrations(userId: string) {
    loading.value = true
    try {
      const q = query(collection(db, 'registrations'), where('userId', '==', userId))
      const snapshot = await getDocs(q)
      userRegistrations.value = snapshot.docs
        .map((d) => docToRegistration(d.id, d.data()))
        .filter((r) => r.status === 'confirmed')
    } finally {
      loading.value = false
    }
  }

  async function fetchEventRegistrations(eventId: string): Promise<Registration[]> {
    const q = query(
      collection(db, 'registrations'),
      where('eventId', '==', eventId),
      where('status', '==', 'confirmed')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => docToRegistration(d.id, d.data()))
  }

  async function isUserRegistered(userId: string, eventId: string): Promise<boolean> {
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', userId),
      where('eventId', '==', eventId),
      where('status', '==', 'confirmed')
    )
    const snapshot = await getDocs(q)
    return !snapshot.empty
  }

  return {
    userRegistrations,
    loading,
    error,
    registerForEvent,
    cancelRegistration,
    fetchUserRegistrations,
    fetchEventRegistrations,
    isUserRegistered,
  }
})
