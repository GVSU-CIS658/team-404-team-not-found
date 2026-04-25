import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

const GR_EVENTS = [
  {
    title: 'GR Symphony: Beethoven & Beyond',
    description:
      'Experience the Grand Rapids Symphony perform Beethoven\'s iconic Fifth Symphony alongside works by Brahms and Dvořák. Held at the stunning DeVos Performance Hall, this is an unmissable evening of classical music in the heart of downtown Grand Rapids.',
    location: 'DeVos Performance Hall, 303 Monroe Ave NW, Grand Rapids, MI',
    dateTime: new Date('2026-05-10T19:30:00'),
    category: 'Music',
    ticketLimit: 400,
    flyerURL: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&auto=format&fit=crop',
  },
  {
    title: 'Founders Brewing Craft Beer Festival',
    description:
      'Join us for a celebration of craft beer at Founders Brewing Company! Sample 40+ specialty brews, meet the brewmasters, enjoy live music on the outdoor stage, and indulge in locally sourced food trucks. A bucket-list event for craft beer lovers in West Michigan.',
    location: 'Founders Brewing Co., 235 Grandville Ave SW, Grand Rapids, MI',
    dateTime: new Date('2026-05-16T14:00:00'),
    category: 'Food & Drink',
    ticketLimit: 600,
    flyerURL: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop',
  },
  {
    title: 'ArtPrize Exhibition Opening Night',
    description:
      'ArtPrize returns to Grand Rapids for its annual international art competition and festival. Explore over 200 artworks installed across downtown venues, galleries, restaurants, and parks. Opening night features artist meet-and-greets, live music, and a street party.',
    location: 'Downtown Grand Rapids — multiple venues',
    dateTime: new Date('2026-09-18T18:00:00'),
    category: 'Arts',
    ticketLimit: 1000,
    flyerURL: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&auto=format&fit=crop',
  },
  {
    title: 'West Michigan 5K & Fun Run',
    description:
      'Lace up your shoes for the annual West Michigan 5K! Whether you\'re a seasoned runner or a first-timer, this community race through the scenic streets of Grand Rapids is fun for all ages. Proceeds support local youth athletic programs.',
    location: 'Rosa Parks Circle, 38 Monroe Center St NW, Grand Rapids, MI',
    dateTime: new Date('2026-05-02T08:00:00'),
    category: 'Sports',
    ticketLimit: 500,
    flyerURL: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&auto=format&fit=crop',
  },
  {
    title: 'Downtown GR Farmers Market Day',
    description:
      'Shop fresh produce, artisan goods, handmade crafts, and delicious food from 80+ local vendors at the beloved Grand Rapids Fulton Street Farmers Market. Live music, cooking demos, and family-friendly activities make this a perfect Saturday outing.',
    location: 'Fulton Street Farmers Market, 1145 Fulton St E, Grand Rapids, MI',
    dateTime: new Date('2026-05-09T08:00:00'),
    category: 'Community',
    ticketLimit: 800,
    flyerURL: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&auto=format&fit=crop',
  },
  {
    title: 'GVSU Innovation & Entrepreneurship Summit',
    description:
      'Connect with entrepreneurs, investors, and innovators at GVSU\'s premier annual summit. Features keynote speakers from Silicon Valley, pitch competitions with $10,000 in prizes, panel discussions on AI and web technologies, and networking sessions.',
    location: 'Grand Valley State University, Seidman Center, Grand Rapids, MI',
    dateTime: new Date('2026-05-22T09:00:00'),
    category: 'Education',
    ticketLimit: 300,
    flyerURL: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
  },
  {
    title: 'Frederik Meijer Gardens Summer Concert',
    description:
      'Enjoy an unforgettable evening under the stars at the Frederik Meijer Gardens & Sculpture Park. This summer series brings world-class musical acts to one of Michigan\'s most beautiful outdoor amphitheaters, surrounded by stunning sculpture and gardens.',
    location: 'Frederik Meijer Gardens, 1000 E Beltline Ave NE, Grand Rapids, MI',
    dateTime: new Date('2026-06-12T19:00:00'),
    category: 'Music',
    ticketLimit: 1800,
    flyerURL: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&auto=format&fit=crop',
  },
  {
    title: 'Greek on the Street Food Festival',
    description:
      'Celebrate Grand Rapids\' rich Greek heritage with authentic cuisine, traditional music, folk dancing performances, and cultural exhibits. Taste souvlaki, spanakopita, baklava, and more at this beloved annual festival in Heritage Hill.',
    location: 'Heritage Hill, Grand Rapids, MI 49506',
    dateTime: new Date('2026-05-30T11:00:00'),
    category: 'Food & Drink',
    ticketLimit: 700,
    flyerURL: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop',
  },
  {
    title: 'Grand Rapids Pride Festival 2026',
    description:
      'Join thousands in celebrating love, diversity, and community at Grand Rapids Pride. Featuring a vibrant parade through downtown, live performances on multiple stages, vendor village, food court, and family-friendly activities. All are welcome!',
    location: 'Calder Plaza, 300 Ottawa Ave NW, Grand Rapids, MI',
    dateTime: new Date('2026-06-20T10:00:00'),
    category: 'Community',
    ticketLimit: 2000,
    flyerURL: 'https://images.unsplash.com/photo-1561505457-3bcad021f8ee?w=800&auto=format&fit=crop',
  },
  {
    title: 'Grand Rapids Comic Con',
    description:
      'West Michigan\'s largest pop culture convention returns! Meet celebrity guests, explore thousands of square feet of vendor floor space, attend panels on comics, gaming, film & TV, cosplay contests, and artist alley. Something for every fan!',
    location: 'DeVos Place Convention Center, 303 Monroe Ave NW, Grand Rapids, MI',
    dateTime: new Date('2026-07-11T10:00:00'),
    category: 'General',
    ticketLimit: 3000,
    flyerURL: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&auto=format&fit=crop',
  },
  {
    title: 'West Michigan Jazz Festival',
    description:
      'Three days of world-class jazz featuring local legends and nationally acclaimed artists performing across multiple outdoor stages in Riverside Park. Food vendors, art displays, and a jazz education tent round out this beloved festival.',
    location: 'Riverside Park, 2001 Valley Ave NW, Grand Rapids, MI',
    dateTime: new Date('2026-07-17T17:00:00'),
    category: 'Music',
    ticketLimit: 1200,
    flyerURL: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&auto=format&fit=crop',
  },
  {
    title: 'GRCC Coding Bootcamp — Web Dev Intro',
    description:
      'Kickstart your coding journey at this free beginner-friendly bootcamp hosted by Grand Rapids Community College. Learn HTML, CSS, JavaScript, and Vue.js basics with hands-on projects. Laptops provided. Perfect for career changers and beginners.',
    location: 'GRCC Sneden Hall, 143 Bostwick Ave NE, Grand Rapids, MI',
    dateTime: new Date('2026-05-07T18:00:00'),
    category: 'Education',
    ticketLimit: 60,
    flyerURL: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop',
  },
]

export async function seedEventsIfEmpty(userId: string, userName: string) {
  try {
    const snapshot = await getDocs(collection(db, 'events'))
    if (!snapshot.empty) return // already has events

    const promises = GR_EVENTS.map((evt) =>
      addDoc(collection(db, 'events'), {
        ...evt,
        ticketsRemaining: evt.ticketLimit,
        createdBy: userId,
        createdByName: userName,
        dateTime: Timestamp.fromDate(evt.dateTime),
        createdAt: Timestamp.now(),
      })
    )
    await Promise.all(promises)
    console.log('[Schedulr] Seeded', GR_EVENTS.length, 'Grand Rapids events ✓')
  } catch (err) {
    // Silently fail — seeding is best-effort
    console.warn('[Schedulr] Seed skipped:', err)
  }
}
