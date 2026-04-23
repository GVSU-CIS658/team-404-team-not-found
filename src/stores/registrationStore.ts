import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, doc, getDocs, query, where,
  Timestamp, runTransaction,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Registration } from '../types'

export const useRegistrationStore = defineStore('registrations', () => {
  const userRegistrations = ref<Registration[]>([])
  const loading = ref(false)
  const error = ref('')

  function docToReg(id: string, data: any): Registration {
    return {
      id,
      userId: data.userId,
      userName: data.userName || '',
      eventId: data.eventId,
      eventTitle: data.eventTitle || '',
      registeredAt: data.registeredAt?.toDate?.() || new Date(data.registeredAt),
      status: data.status,
      venueId: data.venueId,
      venueName: data.venueName,
      venueAddress: data.venueAddress,
    }
  }

  async function registerForEvent(
    userId: string,
    userName: string,
    eventId: string,
    eventTitle: string,
    venueId?: string,
    venueName?: string,
    venueAddress?: string
  ) {
    error.value = ''
    try {
      await runTransaction(db, async (transaction) => {
        const eventRef = doc(db, 'events', eventId)
        const eventSnap = await transaction.get(eventRef)
        if (!eventSnap.exists()) throw new Error('Event not found')

        const eventData = eventSnap.data()

        if (venueId && eventData.venues) {
          // Multi-venue: decrement the specific venue's ticketsRemaining
          const venues = [...eventData.venues]
          const idx = venues.findIndex((v: any) => v.id === venueId)
          if (idx === -1) throw new Error('Venue not found')
          if (venues[idx].ticketsRemaining <= 0) throw new Error('No tickets left for this venue')
          venues[idx] = { ...venues[idx], ticketsRemaining: venues[idx].ticketsRemaining - 1 }
          const totalRemaining = venues.reduce((s: number, v: any) => s + v.ticketsRemaining, 0)
          transaction.update(eventRef, { venues, ticketsRemaining: totalRemaining })
        } else {
          // Single venue: decrement event-level ticketsRemaining
          if (eventData.ticketsRemaining <= 0) throw new Error('No tickets remaining')
          transaction.update(eventRef, { ticketsRemaining: eventData.ticketsRemaining - 1 })
        }

        const regRef = doc(collection(db, 'registrations'))
        transaction.set(regRef, {
          userId, userName, eventId, eventTitle,
          registeredAt: Timestamp.now(),
          status: 'confirmed',
          ...(venueId ? { venueId, venueName, venueAddress } : {}),
        })
      })
      await fetchUserRegistrations(userId)
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function cancelRegistration(registrationId: string, eventId: string, userId: string, venueId?: string) {
    await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'events', eventId)
      const eventSnap = await transaction.get(eventRef)

      if (eventSnap.exists()) {
        const eventData = eventSnap.data()
        if (venueId && eventData.venues) {
          const venues = [...eventData.venues]
          const idx = venues.findIndex((v: any) => v.id === venueId)
          if (idx !== -1) {
            venues[idx] = { ...venues[idx], ticketsRemaining: venues[idx].ticketsRemaining + 1 }
            const totalRemaining = venues.reduce((s: number, v: any) => s + v.ticketsRemaining, 0)
            transaction.update(eventRef, { venues, ticketsRemaining: totalRemaining })
          }
        } else {
          transaction.update(eventRef, { ticketsRemaining: eventData.ticketsRemaining + 1 })
        }
      }
      transaction.update(doc(db, 'registrations', registrationId), { status: 'cancelled' })
    })
    await fetchUserRegistrations(userId)
  }

  async function fetchUserRegistrations(userId: string) {
    loading.value = true
    try {
      const q = query(collection(db, 'registrations'), where('userId', '==', userId))
      const snapshot = await getDocs(q)
      userRegistrations.value = snapshot.docs
        .map(d => docToReg(d.id, d.data()))
        .filter(r => r.status === 'confirmed')
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
    return snapshot.docs.map(d => docToReg(d.id, d.data()))
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

  async function getUserVenueRegistration(userId: string, eventId: string): Promise<Registration | null> {
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', userId),
      where('eventId', '==', eventId),
      where('status', '==', 'confirmed')
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return docToReg(d.id, d.data())
  }

  return {
    userRegistrations, loading, error,
    registerForEvent, cancelRegistration,
    fetchUserRegistrations, fetchEventRegistrations,
    isUserRegistered, getUserVenueRegistration,
  }
})
