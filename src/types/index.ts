export interface User {
  uid: string
  name: string
  email: string
  role: 'organizer' | 'user'
  createdAt: Date
}

export interface Event {
  id?: string
  title: string
  description: string
  location: string
  dateTime: Date
  ticketLimit: number
  ticketsRemaining: number
  createdBy: string
  createdByName: string
  flyerURL: string
  createdAt: Date
  category: string
}

export interface Registration {
  id?: string
  userId: string
  userName: string
  eventId: string
  eventTitle: string
  registeredAt: Date
  status: 'confirmed' | 'cancelled'
}
