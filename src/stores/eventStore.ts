import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, Timestamp, limit,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Event, Venue } from '../types'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function venueFromFirestore(v: any): Venue {
  return {
    id: v.id,
    name: v.name,
    address: v.address,
    dateTime: v.dateTime?.toDate?.() || new Date(v.dateTime),
    ticketLimit: v.ticketLimit,
    ticketsRemaining: v.ticketsRemaining,
  }
}

function venueToFirestore(v: Venue) {
  return {
    id: v.id,
    name: v.name,
    address: v.address,
    dateTime: Timestamp.fromDate(new Date(v.dateTime)),
    ticketLimit: v.ticketLimit,
    ticketsRemaining: v.ticketsRemaining,
  }
}

export const useEventStore = defineStore('events', () => {
  const events = ref<Event[]>([])
  const loading = ref(false)
  const error = ref('')

  function docToEvent(id: string, data: any): Event {
    const venues: Venue[] | undefined = data.venues
      ? data.venues.map((v: any) => venueFromFirestore(v))
      : undefined
    return {
      id,
      title: data.title,
      description: data.description,
      location: data.location,
      dateTime: data.dateTime?.toDate?.() || new Date(data.dateTime),
      ticketLimit: data.ticketLimit,
      ticketsRemaining: data.ticketsRemaining,
      createdBy: data.createdBy,
      createdByName: data.createdByName || '',
      flyerURL: data.flyerURL || '',
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      category: data.category || 'General',
      venues,
    }
  }

  async function fetchEvents() {
    loading.value = true
    try {
      // Performance: limit to 60 most-recent events, only future ones
      const nowTs = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)) // include today
      const q = query(
        collection(db, 'events'),
        where('dateTime', '>=', nowTs),
        orderBy('dateTime', 'asc'),
        limit(60)
      )
      const snapshot = await getDocs(q)
      events.value = snapshot.docs.map(d => docToEvent(d.id, d.data()))
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // Lighter query for home page — next 6 upcoming
  const upcomingEvents = ref<Event[]>([])
  async function fetchUpcomingEvents(n = 6) {
    try {
      const nowTs = Timestamp.fromDate(new Date(Date.now() - 12 * 60 * 60 * 1000))
      const q = query(
        collection(db, 'events'),
        where('dateTime', '>=', nowTs),
        orderBy('dateTime', 'asc'),
        limit(n)
      )
      const snapshot = await getDocs(q)
      upcomingEvents.value = snapshot.docs.map(d => docToEvent(d.id, d.data()))
    } catch (e: any) {
      error.value = e.message
    }
  }

  async function fetchEvent(id: string): Promise<Event | null> {
    const snap = await getDoc(doc(db, 'events', id))
    if (!snap.exists()) return null
    return docToEvent(snap.id, snap.data())
  }

  async function createEvent(event: Omit<Event, 'id' | 'createdAt'>, flyerFile?: File): Promise<string> {
    let flyerURL = event.flyerURL || ''
    if (flyerFile) flyerURL = await fileToBase64(flyerFile)

    const primaryLocation = event.venues?.length ? event.venues[0].address : event.location
    const primaryDateTime  = event.venues?.length ? new Date(event.venues[0].dateTime) : new Date(event.dateTime)
    const totalLimit       = event.venues?.length ? event.venues.reduce((s, v) => s + v.ticketLimit, 0) : event.ticketLimit

    const docData: any = {
      title: event.title,
      description: event.description,
      location: primaryLocation,
      dateTime: Timestamp.fromDate(primaryDateTime),
      ticketLimit: totalLimit,
      ticketsRemaining: totalLimit,
      createdBy: event.createdBy,
      createdByName: event.createdByName,
      flyerURL,
      category: event.category,
      createdAt: Timestamp.now(),
    }
    if (event.venues?.length) docData.venues = event.venues.map(venueToFirestore)

    const docRef = await addDoc(collection(db, 'events'), docData)
    await fetchEvents()
    return docRef.id
  }

  async function updateEvent(id: string, updates: Partial<Event>, flyerFile?: File) {
    const data: any = { ...updates }
    if (flyerFile) data.flyerURL = await fileToBase64(flyerFile)
    if (data.dateTime) data.dateTime = Timestamp.fromDate(new Date(data.dateTime))
    if (data.venues) {
      const vs = data.venues as Venue[]
      data.venues = vs.map(venueToFirestore)
      data.location = vs[0]?.address || data.location
      data.ticketLimit = vs.reduce((s: number, v: Venue) => s + v.ticketLimit, 0)
    }
    delete data.id
    delete data.createdAt
    await updateDoc(doc(db, 'events', id), data)
    await fetchEvents()
  }

  async function deleteEvent(id: string) {
    await deleteDoc(doc(db, 'events', id))
    events.value = events.value.filter(e => e.id !== id)
  }

  async function fetchMyEvents(userId: string) {
    loading.value = true
    try {
      const q = query(collection(db, 'events'), where('createdBy', '==', userId), orderBy('dateTime', 'asc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => docToEvent(d.id, d.data()))
    } finally {
      loading.value = false
    }
  }

  return { events, upcomingEvents, loading, error, fetchEvents, fetchUpcomingEvents, fetchEvent, createEvent, updateEvent, deleteEvent, fetchMyEvents }
})
