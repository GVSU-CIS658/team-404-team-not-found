export interface User {
  uid: string
  name: string
  email: string
  role: 'organizer' | 'user'
  createdAt: Date
}

/** A single venue for a multi-venue event */
export interface Venue {
  id: string              // client-generated UUID
  name: string            // e.g. "Van Andel Arena"
  address: string         // e.g. "130 W Fulton St, Grand Rapids, MI"
  dateTime: Date          // this venue's date/time
  ticketLimit: number
  ticketsRemaining: number
}

export interface Event {
  id?: string
  title: string
  description: string
  /** Primary/fallback location (first venue address or single location) */
  location: string
  /** Primary/fallback dateTime */
  dateTime: Date
  ticketLimit: number
  ticketsRemaining: number
  createdBy: string
  createdByName: string
  flyerURL: string
  createdAt: Date
  category: string
  /** Optional multi-venue support — if present, overrides single location */
  venues?: Venue[]
}

export interface Registration {
  id?: string
  userId: string
  userName: string
  eventId: string
  eventTitle: string
  registeredAt: Date
  status: 'confirmed' | 'cancelled'
  /** Which venue they registered for (multi-venue events) */
  venueId?: string
  venueName?: string
  venueAddress?: string
}
