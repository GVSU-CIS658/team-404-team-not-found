import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import type { Event } from '../types'

export const useEventStore = defineStore('events', () => {
  const events = ref<Event[]>([])
  const loading = ref(false)
  const error = ref('')

  function docToEvent(id: string, data: any): Event {
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
    }
  }

  async function fetchEvents() {
    loading.value = true
    try {
      const q = query(collection(db, 'events'), orderBy('dateTime', 'asc'))
      const snapshot = await getDocs(q)
      events.value = snapshot.docs.map((d) => docToEvent(d.id, d.data()))
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchEvent(id: string): Promise<Event | null> {
    const snap = await getDoc(doc(db, 'events', id))
    if (!snap.exists()) return null
    return docToEvent(snap.id, snap.data())
  }

  async function createEvent(event: Omit<Event, 'id' | 'createdAt'>, flyerFile?: File): Promise<string> {
    let flyerURL = ''
    if (flyerFile) {
      const fileRef = storageRef(storage, `flyers/${Date.now()}_${flyerFile.name}`)
      await uploadBytes(fileRef, flyerFile)
      flyerURL = await getDownloadURL(fileRef)
    }
    const docRef = await addDoc(collection(db, 'events'), {
      ...event,
      flyerURL,
      dateTime: Timestamp.fromDate(new Date(event.dateTime)),
      createdAt: Timestamp.now(),
    })
    await fetchEvents()
    return docRef.id
  }

  async function updateEvent(id: string, updates: Partial<Event>, flyerFile?: File) {
    const data: any = { ...updates }
    if (flyerFile) {
      const fileRef = storageRef(storage, `flyers/${Date.now()}_${flyerFile.name}`)
      await uploadBytes(fileRef, flyerFile)
      data.flyerURL = await getDownloadURL(fileRef)
    }
    if (data.dateTime) {
      data.dateTime = Timestamp.fromDate(new Date(data.dateTime))
    }
    delete data.id
    delete data.createdAt
    await updateDoc(doc(db, 'events', id), data)
    await fetchEvents()
  }

  async function deleteEvent(id: string) {
    await deleteDoc(doc(db, 'events', id))
    events.value = events.value.filter((e) => e.id !== id)
  }

  async function fetchMyEvents(userId: string) {
    loading.value = true
    try {
      const q = query(collection(db, 'events'), where('createdBy', '==', userId), orderBy('dateTime', 'asc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((d) => docToEvent(d.id, d.data()))
    } finally {
      loading.value = false
    }
  }

  return { events, loading, error, fetchEvents, fetchEvent, createEvent, updateEvent, deleteEvent, fetchMyEvents }
})
