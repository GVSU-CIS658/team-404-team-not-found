import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, doc, getDocs, query, where,
  Timestamp, runTransaction,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase'
import type { Registration } from '../types'

// Backend-mediated callables for the two write paths. The Cloud Functions
// re-validate the caller's auth, run the ticket-counter update inside a
// server-side transaction via the Admin SDK, and return a success result.
const callRegisterForEvent    = httpsCallable<unknown, { registrationId: string }>(functions, 'registerForEvent')
const callCancelRegistration  = httpsCallable<unknown, { success: boolean }>(functions, 'cancelRegistration')

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
    _userName: string,
    eventId: string,
    _eventTitle: string,
    venueId?: string,
    venueName?: string,
    venueAddress?: string
  ) {
    error.value = ''
    try {
      // Primary path: Cloud Function. Server pulls the userName from the
      // user doc and the eventTitle from the event doc, so we don't need
      // to forward them.
      await callRegisterForEvent({ eventId, venueId, venueName, venueAddress })
      await fetchUserRegistrations(userId)
    } catch (e: any) {
      // Surface the function's HttpsError details verbatim if available.
      const msg = e?.details?.message || e?.message || 'Registration failed'

      // If the function path is genuinely unreachable (network / unavailable),
      // fall back to a direct transactional write so the demo keeps working.
      const code = e?.code || ''
      const isReachable = !/unavailable|internal|deadline-exceeded|cancelled/i.test(code)
      if (isReachable) {
        error.value = msg
        throw e
      }

      console.warn('[registerForEvent] Cloud Function unreachable, falling back to direct write', e)
      try {
        await registerForEventDirect(userId, _userName, eventId, _eventTitle, venueId, venueName, venueAddress)
      } catch (fallbackErr: any) {
        error.value = fallbackErr.message
        throw fallbackErr
      }
    }
  }

  async function registerForEventDirect(
    userId: string,
    userName: string,
    eventId: string,
    eventTitle: string,
    venueId?: string,
    venueName?: string,
    venueAddress?: string,
  ) {
    await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'events', eventId)
      const eventSnap = await transaction.get(eventRef)
      if (!eventSnap.exists()) throw new Error('Event not found')

      const eventData = eventSnap.data()

      if (venueId && eventData.venues) {
        const venues = [...eventData.venues]
        const idx = venues.findIndex((v: any) => v.id === venueId)
        if (idx === -1) throw new Error('Venue not found')
        if (venues[idx].ticketsRemaining <= 0) throw new Error('No tickets left for this venue')
        venues[idx] = { ...venues[idx], ticketsRemaining: venues[idx].ticketsRemaining - 1 }
        const totalRemaining = venues.reduce((s: number, v: any) => s + v.ticketsRemaining, 0)
        transaction.update(eventRef, { venues, ticketsRemaining: totalRemaining })
      } else {
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
  }

  async function cancelRegistration(registrationId: string, eventId: string, userId: string, venueId?: string) {
    try {
      await callCancelRegistration({ registrationId })
      await fetchUserRegistrations(userId)
    } catch (e: any) {
      const code = e?.code || ''
      const isReachable = !/unavailable|internal|deadline-exceeded|cancelled/i.test(code)
      if (isReachable) {
        error.value = e?.details?.message || e?.message || 'Cancellation failed'
        throw e
      }
      console.warn('[cancelRegistration] Cloud Function unreachable, falling back to direct write', e)
      await cancelRegistrationDirect(registrationId, eventId, userId, venueId)
    }
  }

  async function cancelRegistrationDirect(registrationId: string, eventId: string, userId: string, venueId?: string) {
    await runTransaction(db, async (transaction) => {
      const regRef = doc(db, 'registrations', registrationId)
      const regSnap = await transaction.get(regRef)
      if (!regSnap.exists() || regSnap.data().status === 'cancelled') return

      const eventRef = doc(db, 'events', eventId)
      const eventSnap = await transaction.get(eventRef)

      if (eventSnap.exists()) {
        const eventData = eventSnap.data()
        if (venueId && eventData.venues) {
          const venues = [...eventData.venues]
          const idx = venues.findIndex((v: any) => v.id === venueId)
          if (idx !== -1) {
            const capped = Math.min(venues[idx].ticketsRemaining + 1, venues[idx].ticketLimit)
            venues[idx] = { ...venues[idx], ticketsRemaining: capped }
            const totalRemaining = venues.reduce((s: number, v: any) => s + v.ticketsRemaining, 0)
            transaction.update(eventRef, { venues, ticketsRemaining: totalRemaining })
          }
        } else {
          const capped = Math.min((eventData.ticketsRemaining ?? 0) + 1, eventData.ticketLimit ?? Infinity)
          transaction.update(eventRef, { ticketsRemaining: capped })
        }
      }
      transaction.update(regRef, { status: 'cancelled' })
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
